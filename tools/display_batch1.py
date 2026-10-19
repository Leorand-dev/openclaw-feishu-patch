# -*- coding: utf-8 -*-
"""Display polish batch 1: blank-window fix, compact status, elapsed/last-tool, narration cap."""
import pathlib

P = pathlib.Path(r"D:\deepseek\review-wayE\fixed\patches\2026.10.5\patched.mjs")
t = P.read_text(encoding="utf-8")


def rep(old, new):
    global t
    assert t.count(old) == 1, old[:120]
    t = t.replace(old, new, 1)


# ---------------- state/constants ----------------
rep('''	const NARRATION_MAX_CHARS = 240;
	const STATUS_MAX_CHARS = 600;
	let lastToolActivityAt = 0;''',
    '''	const NARRATION_MAX_CHARS = (() => {
		const configured = Number(account.config?.narrationMaxChars);
		return Number.isFinite(configured) && configured >= 40 && configured <= 500 ? configured : 120;
	})();
	const STATUS_LINE_MAX_CHARS = 160;
	const STATUS_MAX_CHARS = 400;
	const SHOW_LAST_TOOL_LABEL = account.config?.showLastToolLabel !== false;
	const SHOW_TOOL_ELAPSED = account.config?.showToolElapsed !== false;
	const TOOL_ELAPSED_REFRESH_MS = 5e3;
	let toolPhaseStartedAt = 0;
	let waitingRefreshTimer;
	let lastToolActivityAt = 0;''')

# ---------------- build waiting/status ----------------
rep('''	const buildWaitingLine = (total) => {
		const template = resolveProgressText("toolWaiting", "\\u23F3 \\u5df2\\u6267\\u884c {count} \\u4e2a\\u5de5\\u5177\\uff0c\\u7b49\\u5f85\\u4e2d\\u2026");
		const base = template.split("{count}").join(String(total));
		if (account.config?.showLastToolLabel === true && lastToolLabel) return `${base}\\uff08\\u6700\\u540e\\uff1a${lastToolLabel}\\uff09`;
		return base;
	};''',
    '''	const formatElapsedDuration = (elapsedMs) => {
		const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1e3));
		if (totalSeconds < 60) return `${totalSeconds}s`;
		return `${Math.floor(totalSeconds / 60)}m${String(totalSeconds % 60).padStart(2, "0")}s`;
	};
	const buildWaitingLine = (total) => {
		const template = resolveProgressText("toolWaiting", "\\u23F3 \\u5df2\\u6267\\u884c {count} \\u4e2a\\u5de5\\u5177");
		const base = template.split("{count}").join(String(total));
		const details = [];
		if (SHOW_LAST_TOOL_LABEL && lastToolLabel) details.push(`\\u6700\\u540e\\uff1a${lastToolLabel}`);
		if (SHOW_TOOL_ELAPSED && toolPhaseStartedAt > 0) {
			const elapsedMs = Date.now() - toolPhaseStartedAt;
			if (elapsedMs >= 1e3) details.push(formatElapsedDuration(elapsedMs));
		}
		if (details.length > 0) return `${base} \\u00b7 ${details.join(" \\u00b7 ")}`;
		return `${base}\\uff0c\\u7b49\\u5f85\\u4e2d\\u2026`;
	};''')

rep('''	const buildStatusText = () => {
		const parts = [waitingLine, narrationLine, itemStatusLine, compactionLine].filter(Boolean);
		if (parts.length === 0) return "";
		return truncateDisplayText(parts.join("\\n\\n"), STATUS_MAX_CHARS);
	};''',
    '''	const buildStatusText = () => {
		const primary = waitingLine || itemStatusLine || compactionLine || narrationLine;
		if (!primary) return "";
		const extras = [];
		if (narrationLine && narrationLine !== primary) extras.push(narrationLine);
		if (itemStatusLine && itemStatusLine !== primary) extras.push(itemStatusLine);
		if (compactionLine && compactionLine !== primary) extras.push(compactionLine);
		const secondary = extras.length > 0 ? truncateDisplayText(extras.join(" \\u00b7 "), STATUS_LINE_MAX_CHARS) : "";
		const lines = [truncateDisplayText(primary, STATUS_LINE_MAX_CHARS), secondary].filter(Boolean);
		return truncateDisplayText(lines.join("\\n"), STATUS_MAX_CHARS);
	};''')

# ---------------- timer helpers after flushCardUpdate ----------------
rep('''	const clearPrewarmStatus = () => {
		if (!prewarmStatusLine) return;''',
    '''	const clearWaitingRefreshTimer = () => {
		if (waitingRefreshTimer !== void 0) {
			clearTimeout(waitingRefreshTimer);
			waitingRefreshTimer = void 0;
		}
	};
	const scheduleWaitingRefresh = () => {
		if (waitingRefreshTimer !== void 0 || aggregatedToolTotal === 0) return;
		waitingRefreshTimer = setTimeout(() => {
			waitingRefreshTimer = void 0;
			if (aggregatedToolTotal === 0 || streaming?.isActive() !== true) return;
			waitingLine = buildWaitingLine(aggregatedToolTotal);
			flushCardUpdate();
			scheduleWaitingRefresh();
		}, TOOL_ELAPSED_REFRESH_MS);
		waitingRefreshTimer.unref?.();
	};
	const clearPrewarmStatus = () => {
		if (!prewarmStatusLine) return;''')

# ---------------- assistant message start: keep initial status until content/tool ----------------
rep('''			onAssistantMessageStart: previewStreamingEnabled ? () => {
				renderEpoch += 1;
				if (aggregatedToolTotal > 0) clearTransientStatusLines();
				else clearCardStatusLines();
				flushCardUpdate(true);
				return false;
			} : void 0,''',
    '''			onAssistantMessageStart: previewStreamingEnabled ? () => {
				renderEpoch += 1;
				if (aggregatedToolTotal > 0) clearTransientStatusLines();
				else if (streamText.trim() || reasoningText.trim() || narrationLine) clearCardStatusLines();
				else if (!prewarmStatusLine && !waitingLine) {
					prewarmStatusLine = resolveProgressText("processing", "\\u270D\\uFE0F \\u6b63\\u5728\\u751f\\u6210\\u56de\\u590d\\u2026");
					waitingLine = prewarmStatusLine;
				}
				flushCardUpdate(true);
				return false;
			} : void 0,''')

# ---------------- aggregate: start elapsed timer on first tool ----------------
rep('''		aggregatedToolTotal += 1;
		lastToolLabel = entry.label;
		lastToolActivityAt = Date.now();''',
    '''		aggregatedToolTotal += 1;
		lastToolLabel = entry.label;
		if (aggregatedToolTotal === 1) {
			toolPhaseStartedAt = Date.now();
			scheduleWaitingRefresh();
		}
		lastToolActivityAt = Date.now();''')

# ---------------- clear timers on final / reply / reset / close ----------------
rep('''				if (info?.kind === "final") {
					renderEpoch += 1;
					clearCardStatusLines();
					flushCardUpdate(true);
				}''',
    '''				if (info?.kind === "final") {
					renderEpoch += 1;
					clearWaitingRefreshTimer();
					toolPhaseStartedAt = 0;
					clearCardStatusLines();
					flushCardUpdate(true);
				}''')

rep('''		clearCardStatusLines();
		renderEpoch += 1;
		aggregatedToolSummaryCounts.clear();
		aggregatedToolTotal = 0;
		lastToolLabel = "";
		prewarmRequested = false;
		prewarmStatusLine = "";
		cardFlushPending = false;
		clearIdleCloseTimer();''',
    '''		clearCardStatusLines();
		renderEpoch += 1;
		aggregatedToolSummaryCounts.clear();
		aggregatedToolTotal = 0;
		lastToolLabel = "";
		prewarmRequested = false;
		prewarmStatusLine = "";
		cardFlushPending = false;
		clearWaitingRefreshTimer();
		toolPhaseStartedAt = 0;
		clearIdleCloseTimer();''')

rep('''	const performStreamingClose = async (disposition) => {
		renderEpoch += 1;
		clearIdleCloseTimer();''',
    '''	const performStreamingClose = async (disposition) => {
		renderEpoch += 1;
		clearIdleCloseTimer();
		clearWaitingRefreshTimer();
		toolPhaseStartedAt = 0;''')

rep('''				prewarmRequested = false;
				prewarmStatusLine = "";
				cardFlushPending = false;
				clearCardStatusLines();
				clearIdleCloseTimer();''',
    '''				prewarmRequested = false;
				prewarmStatusLine = "";
				cardFlushPending = false;
				clearCardStatusLines();
				clearWaitingRefreshTimer();
				toolPhaseStartedAt = 0;
				clearIdleCloseTimer();''')

P.write_text(t, encoding="utf-8", newline="\n")
print("display batch1 applied")
