# -*- coding: utf-8 -*-
"""Display batch 2: elapsed config, status position, reasoning cap/final hide, final summary."""
import pathlib

P = pathlib.Path(r"D:\deepseek\review-wayE\fixed\patches\2026.10.5\patched.mjs")
t = P.read_text(encoding="utf-8")


def rep(old, new):
    global t
    assert t.count(old) == 1, old[:140]
    t = t.replace(old, new, 1)


# ---------------- config constants ----------------
rep('''	const SHOW_LAST_TOOL_LABEL = account.config?.showLastToolLabel !== false;
	const SHOW_TOOL_ELAPSED = account.config?.showToolElapsed !== false;
	const TOOL_ELAPSED_REFRESH_MS = 5e3;''',
    '''	const SHOW_LAST_TOOL_LABEL = account.config?.showLastToolLabel !== false;
	const SHOW_TOOL_ELAPSED = account.config?.showToolElapsed !== false;
	const TOOL_ELAPSED_REFRESH_MS = (() => {
		const configured = Number(account.config?.toolElapsedRefreshMs);
		return Number.isFinite(configured) && configured >= 5e3 && configured <= 6e4 ? configured : 15e3;
	})();
	const statusPosition = account.config?.cardStatusPosition === "top" ? "top" : "bottom";
	const REASONING_MAX_LINES = (() => {
		const configured = Number(account.config?.reasoningMaxLines);
		return Number.isFinite(configured) && configured >= 2 && configured <= 100 ? configured : 12;
	})();
	const HIDE_REASONING_IN_FINAL = account.config?.hideReasoningInFinal !== false;
	const FINAL_TOOL_SUMMARY = account.config?.finalToolSummary === true;''')

# ---------------- elapsed timer: skip entirely when elapsed disabled ----------------
rep('''	const scheduleWaitingRefresh = () => {
		if (waitingRefreshTimer !== void 0 || aggregatedToolTotal === 0) return;''',
    '''	const scheduleWaitingRefresh = () => {
		if (!SHOW_TOOL_ELAPSED || waitingRefreshTimer !== void 0 || aggregatedToolTotal === 0) return;''')

# ---------------- reasoning preview cap ----------------
rep('''	const formatReasoningPrefix = (thinking) => {
		if (!thinking) return "";
		return `> 💭 **Thinking**\\n${thinking.replace(/^(?:Reasoning:|Thinking\\.{0,3})\\s*/u, "").replace(/^_(.*)_$/gm, "$1").split("\\n").map((line) => `> ${line}`).join("\\n")}`;
	};''',
    '''	const formatReasoningPrefix = (thinking) => {
		if (!thinking) return "";
		const lines = thinking.replace(/^(?:Reasoning:|Thinking\\.{0,3})\\s*/u, "").replace(/^_(.*)_$/gm, "$1").split("\\n");
		const preview = lines.length > REASONING_MAX_LINES ? [...lines.slice(0, Math.max(1, REASONING_MAX_LINES - 1)), "\\u2026"] : lines;
		return `> 💭 **Thinking**\\n${preview.map((line) => `> ${line}`).join("\\n")}`;
	};''')

# ---------------- session: status position ----------------
rep('''		this.statusElementEnabled = options.statusElement !== false;
		this.statusSentText = "";''',
    '''		this.statusElementEnabled = options.statusElement !== false;
		this.statusPosition = options.statusPosition === "top" ? "top" : "bottom";
		this.statusSentText = "";''')

rep('''		const elements = [{
			tag: "markdown",
			content: "",
			element_id: "content"
		}];
		if (this.statusElementEnabled) elements.push({
			tag: "markdown",
			content: "",
			element_id: "status"
		});
		if (options?.note) {''',
    '''		const contentElement = {
			tag: "markdown",
			content: "",
			element_id: "content"
		};
		const statusElement = {
			tag: "markdown",
			content: "",
			element_id: "status"
		};
		const elements = [];
		if (this.statusElementEnabled && this.statusPosition === "top") elements.push(statusElement);
		elements.push(contentElement);
		if (this.statusElementEnabled && this.statusPosition !== "top") elements.push(statusElement);
		if (options?.note) {''')

# ---------------- session construction: pass status position ----------------
rep('''{ statusElement: statusElementEnabled }''',
    '''{ statusElement: statusElementEnabled, statusPosition }''')

# ---------------- close: capture elapsed, hide reasoning in final, optional summary ----------------
rep('''	const performStreamingClose = async (disposition) => {
		renderEpoch += 1;
		clearIdleCloseTimer();
		clearWaitingRefreshTimer();
		toolPhaseStartedAt = 0;''',
    '''	const performStreamingClose = async (disposition) => {
		const finalToolElapsedMs = toolPhaseStartedAt > 0 ? Date.now() - toolPhaseStartedAt : 0;
		renderEpoch += 1;
		clearIdleCloseTimer();
		clearWaitingRefreshTimer();
		toolPhaseStartedAt = 0;''')

rep('''				const carriedNarration = narrationLine;
				clearCardStatusLines();
				let text = resolveFinalCardText(finalizedReasoningText, finalizedAnswerText);
				if (!text.trim() && carriedNarration) text = carriedNarration;''',
    '''				const carriedNarration = narrationLine;
				clearCardStatusLines();
				const finalReasoningText = HIDE_REASONING_IN_FINAL && finalizedAnswerText.trim() ? "" : finalizedReasoningText;
				let text = resolveFinalCardText(finalReasoningText, finalizedAnswerText);
				if (!text.trim() && carriedNarration) text = carriedNarration;
				if (FINAL_TOOL_SUMMARY && finalizedAnswerText.trim() && aggregatedToolTotal > 0) {
					const summary = `${buildCompletedLine(aggregatedToolTotal)}${finalToolElapsedMs >= 1e3 ? ` \\u00b7 ${formatElapsedDuration(finalToolElapsedMs)}` : ""}`;
					text = `${text}\\n\\n> ${summary}`;
				}''')

P.write_text(t, encoding="utf-8", newline="\n")
print("display batch2 applied")
