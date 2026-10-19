# -*- coding: utf-8 -*-
"""Display/perf batch: final summary, tool-done semantics, status element deletion,
shorter narration, elapsed refresh coalescing, content/status dirty split."""
import pathlib

P = pathlib.Path(r"D:\deepseek\review-wayE\fixed\patches\2026.10.5\patched.mjs")
t = P.read_text(encoding="utf-8")


def rep(old, new):
    global t
    assert t.count(old) == 1, old[:160]
    t = t.replace(old, new, 1)


# ---------- 1) summary: strip markdown + Chinese fallback ----------
rep('''function truncateSummary(text, max = 50) {
	const clean = text.replace(/\\n/g, " ").trim();
	return clean.length <= max ? clean : sliceUtf16Safe(clean, 0, max - 3) + "...";
}''','''function truncateSummary(text, max = 50) {
	const clean = String(text ?? "")
		.replace(/```[\\s\\S]*?```/g, " ")
		.replace(/[*_#>`]/g, " ")
		.replace(/\\s+/g, " ")
		.trim();
	if (!clean) return "✅ 已回复";
	return clean.length <= max ? clean : sliceUtf16Safe(clean, 0, max - 3) + "...";
}''')

# ---------- 2) state: narration cap, tool completion, dirty split ----------
rep('''		return Number.isFinite(configured) && configured >= 40 && configured <= 500 ? configured : 120;''','''		return Number.isFinite(configured) && configured >= 40 && configured <= 500 ? configured : 80;''')
rep('''	let toolPhaseStartedAt = 0;
	let waitingRefreshTimer;''','''	let toolPhaseStartedAt = 0;
	let waitingRefreshTimer;
	let toolPhaseCompleted = false;
	let lastQueuedContent = null;
	let lastQueuedStatus = null;''')

# ---------- 3) tool-done status line ----------
rep('''	const buildCompletedLine = (total) => {
		const template = resolveProgressText("toolCompleted", "\\u2705 \\u5df2\\u6267\\u884c {count} \\u4e2a\\u5de5\\u5177");
		return template.split("{count}").join(String(total));
	};''','''	const buildCompletedLine = (total) => {
		const template = resolveProgressText("toolCompleted", "\\u2705 \\u5df2\\u6267\\u884c {count} \\u4e2a\\u5de5\\u5177");
		return template.split("{count}").join(String(total));
	};
	const buildToolDoneLine = (total) => {
		const template = resolveProgressText("toolDone", "\\u2705 \\u5df2\\u6267\\u884c {count} \\u4e2a\\u5de5\\u5177 \\u00b7 \\u751f\\u6210\\u56de\\u590d\\u4e2d\\u2026");
		return template.split("{count}").join(String(total));
	};''')

# ---------- 4) dirty content/status flush ----------
rep('''	const flushCardUpdate = (force = false) => {
		if (!streamingEnabled || renderMode === "raw") return;
		const active = streaming?.isActive() === true;
		if (!active && !streamingStartPromise) return;
		if (!active && cardFlushPending && !force) return;
		if (!active) cardFlushPending = true;
		const queued = queueFeishuStreamingUpdate({
			queue: partialUpdateQueue,
			session: streaming,
			generation: activeStreamingGeneration,
			startPromise: streamingStartPromise,
			content: () => renderCardContent(),
			status: () => buildStatusText(),
			statusElement: statusElementEnabled,
			onStatusUnavailable: () => { cardFlushPending = false; flushCardUpdate(true); },
			accountId: account.accountId,
			runtime: params.runtime
		});
		partialUpdateQueue = queued.finally(() => {
			cardFlushPending = false;
		});
	};''','''	const flushCardUpdate = (force = false) => {
		if (!streamingEnabled || renderMode === "raw") return;
		const active = streaming?.isActive() === true;
		if (!active && !streamingStartPromise) return;
		if (!active && cardFlushPending && !force) return;
		const nextContent = renderCardContent();
		const nextStatus = buildStatusText();
		const contentChanged = force || nextContent !== lastQueuedContent;
		const statusChanged = force || nextStatus !== lastQueuedStatus;
		if (!contentChanged && !statusChanged) return;
		if (!active) cardFlushPending = true;
		const queued = queueFeishuStreamingUpdate({
			queue: partialUpdateQueue,
			session: streaming,
			generation: activeStreamingGeneration,
			startPromise: streamingStartPromise,
			content: contentChanged ? () => renderCardContent() : void 0,
			status: statusChanged ? () => buildStatusText() : void 0,
			statusElement: statusElementEnabled,
			onStatusUnavailable: () => { cardFlushPending = false; flushCardUpdate(true); },
			accountId: account.accountId,
			runtime: params.runtime
		});
		lastQueuedContent = nextContent;
		lastQueuedStatus = nextStatus;
		partialUpdateQueue = queued.finally(() => {
			cardFlushPending = false;
		});
	};''')

# ---------- 5) elapsed timer: coalesce with tool events / skip after done ----------
rep('''			if (aggregatedToolTotal === 0 || streaming?.isActive() !== true) return;
			waitingLine = buildWaitingLine(aggregatedToolTotal);
			flushCardUpdate();
			scheduleWaitingRefresh();''','''			if (aggregatedToolTotal === 0 || toolPhaseCompleted || streaming?.isActive() !== true) return;
			waitingLine = buildWaitingLine(aggregatedToolTotal);
			flushCardUpdate();
			scheduleWaitingRefresh();''')
rep('''		if (epoch === renderEpoch) updateWaitingLine(buildWaitingLine(aggregatedToolTotal));
		return true;
	};''','''		toolPhaseCompleted = false;
		if (epoch === renderEpoch) {
			updateWaitingLine(buildWaitingLine(aggregatedToolTotal));
			// Coalesce the elapsed heartbeat with tool events: restart the timer after
			// each tool update instead of firing independently right after an event.
			clearWaitingRefreshTimer();
			scheduleWaitingRefresh();
		}
		return true;
	};''')

# ---------- 6) assistant start: switch waiting semantics to tool-done ----------
rep('''			onAssistantMessageStart: previewStreamingEnabled ? () => {
				renderEpoch += 1;
				if (aggregatedToolTotal > 0) clearTransientStatusLines();
				else if (streamText.trim() || reasoningText.trim()) clearCardStatusLines();''','''			onAssistantMessageStart: previewStreamingEnabled ? () => {
				renderEpoch += 1;
				if (aggregatedToolTotal > 0) {
					clearTransientStatusLines();
					toolPhaseCompleted = true;
					clearWaitingRefreshTimer();
					waitingLine = buildToolDoneLine(aggregatedToolTotal);
				}
				else if (streamText.trim() || reasoningText.trim()) clearCardStatusLines();''')

# ---------- 7) reset state flags ----------
rep('''		lastToolLabel = "";
		prewarmRequested = false;
		prewarmStatusLine = "";
		finalDeliverySeen = false;
		cardFlushPending = false;''','''		lastToolLabel = "";
		prewarmRequested = false;
		prewarmStatusLine = "";
		finalDeliverySeen = false;
		toolPhaseCompleted = false;
		lastQueuedContent = null;
		lastQueuedStatus = null;
		cardFlushPending = false;''')
rep('''				lastToolLabel = "";
				prewarmRequested = false;
				prewarmStatusLine = "";
				finalDeliverySeen = false;
				cardFlushPending = false;''','''				lastToolLabel = "";
				prewarmRequested = false;
				prewarmStatusLine = "";
				finalDeliverySeen = false;
				toolPhaseCompleted = false;
				lastQueuedContent = null;
				lastQueuedStatus = null;
				cardFlushPending = false;''')

# ---------- 8) session: delete status element on close (removes final gap) ----------
rep('''	async flushPendingStatusUpdate() {''','''	async deleteStatusElement() {
		if (!this.state || !this.statusElementEnabled) return false;
		this.state.sequence += 1;
		try {
			await this.requestCardKit(`/${this.state.cardId}/elements/status`, "status-delete", "DELETE", () => ({
				sequence: this.state.sequence,
				uuid: `sd_${this.state.cardId}_${this.state.sequence}`
			}), (response, auditContext) => assertSuccessfulCardKitResponse(response, auditContext, "Delete card status element"));
			this.statusSentText = "\\u200B";
			return true;
		} catch (error) {
			this.log?.(`Status element delete failed: ${String(error)}`);
			return false;
		}
	}
	async flushPendingStatusUpdate() {''')

rep('''		this.clearStatusFlushTimer();
		this.statusPendingText = null;
		if (this.statusElementEnabled && this.statusSentText !== "\\u200B") {
			this.statusSentText = "\\u200B";
			await this.writeStatusContent("\\u200B").catch(() => false);
		}
''','''		this.clearStatusFlushTimer();
		this.statusPendingText = null;
		if (this.statusElementEnabled) {
			const deleted = await this.deleteStatusElement().catch(() => false);
			if (!deleted) {
				this.statusSentText = "\\u200B";
				await this.writeStatusContent("\\u200B").catch(() => false);
			}
		}
''')

P.write_text(t, encoding="utf-8", newline="\n")
print("display/perf batch applied")
