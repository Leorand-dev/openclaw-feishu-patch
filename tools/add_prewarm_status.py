import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\patches\2026.10.5\patched.mjs")
t=p.read_text(encoding="utf-8")

def rep(old,new,count=1):
    global t
    assert t.count(old)>=1, old[:100]
    t=t.replace(old,new,count)

# 1) state flags
rep('''	let lastToolLabel = "";
	let aggregatedToolTotal = 0;''','''	let lastToolLabel = "";
	let aggregatedToolTotal = 0;
	let prewarmRequested = false;
	let prewarmStatusLine = "";''')

# 2) clear helper + status functions
rep('''	const updateStreamingStatusLine = (nextStatusLine, startIfNeeded = true) => {
		itemStatusLine = nextStatusLine;''','''	const clearPrewarmStatus = () => {
		if (!prewarmStatusLine) return;
		if (waitingLine === prewarmStatusLine) waitingLine = "";
		prewarmStatusLine = "";
	};
	const updateStreamingStatusLine = (nextStatusLine, startIfNeeded = true) => {
		clearPrewarmStatus();
		itemStatusLine = nextStatusLine;''')
rep('''	const updateWaitingLine = (nextWaitingLine) => {
		waitingLine = nextWaitingLine;''','''	const updateWaitingLine = (nextWaitingLine) => {
		prewarmStatusLine = "";
		waitingLine = nextWaitingLine;''')
rep('''	const clearCardStatusLines = () => {
		waitingLine = "";
		itemStatusLine = "";
		compactionLine = "";
		narrationLine = "";
	};''','''	const clearCardStatusLines = () => {
		waitingLine = "";
		itemStatusLine = "";
		compactionLine = "";
		narrationLine = "";
		prewarmStatusLine = "";
	};''')

# 3) queue streaming partial clears prewarm; reasoning clears too
rep('''			lastSnapshotTextLength = nextText.length;
		}
		flushCardUpdate();
	};
	const startStreaming = () => {''','''			lastSnapshotTextLength = nextText.length;
		}
		if (streamText.trim()) clearPrewarmStatus();
		flushCardUpdate();
	};
	const startStreaming = () => {''')
rep('''	const startStreaming = () => {
		if (!streamingEnabled || streamingStartPromise || streaming || isStreamingStartBackedOff(account.accountId)) return;
		streamingStartPromise = (async () => {''','''	const startStreaming = () => {
		if (!streamingEnabled || streamingStartPromise || streaming || isStreamingStartBackedOff(account.accountId)) return;
		const prewarmForThisStart = prewarmRequested;
		prewarmRequested = false;
		streamingStartPromise = (async () => {''')

# 4) show initial status immediately after prewarmed card is ready
rep('''				params.runtime.log?.(`feishu[${account.accountId}] streaming card ready in ${Date.now() - cardStartAt}ms`);
				streamingStartBackoffUntilByAccount.delete(account.accountId);''','''				params.runtime.log?.(`feishu[${account.accountId}] streaming card ready in ${Date.now() - cardStartAt}ms`);
				if (prewarmForThisStart && !streamText && !reasoningText && !waitingLine && !itemStatusLine && !compactionLine && !narrationLine && aggregatedToolTotal === 0) {
					prewarmStatusLine = resolveProgressText("prewarm", "\\u23F3 \\u5df2\\u6536\\u5230\\uff0c\\u6b63\\u5728\\u5904\\u7406\\u2026");
					waitingLine = prewarmStatusLine;
					flushCardUpdate();
				}
				streamingStartBackoffUntilByAccount.delete(account.accountId);''')

# 5) reset state flags
rep('''		lastToolLabel = "";
		cardFlushPending = false;
		clearIdleCloseTimer();''','''		lastToolLabel = "";
		prewarmRequested = false;
		prewarmStatusLine = "";
		cardFlushPending = false;
		clearIdleCloseTimer();''')
rep('''				lastToolLabel = "";
				cardFlushPending = false;
				clearCardStatusLines();
				clearIdleCloseTimer();''','''				lastToolLabel = "";
				prewarmRequested = false;
				prewarmStatusLine = "";
				cardFlushPending = false;
				clearCardStatusLines();
				clearIdleCloseTimer();''')

# 6) onReplyStart requests prewarm status
rep('''			if (previewStreamingEnabled && renderMode !== "raw" && account.config?.prewarmCard !== false) startStreaming();''','''			if (previewStreamingEnabled && renderMode !== "raw" && account.config?.prewarmCard !== false) {
				prewarmRequested = true;
				startStreaming();
			}''')

# 7) narration clears prewarm status before writing ticker
rep('''		narrationLine = nextLine;
		lastToolActivityAt = Date.now();''','''		clearPrewarmStatus();
		narrationLine = nextLine;
		lastToolActivityAt = Date.now();''')

# 8) reasoning stream clears prewarm status
rep('''				if (nextThinking) {
					reasoningText = nextThinking;
					flushCardUpdate();
				}''','''				if (nextThinking) {
					clearPrewarmStatus();
					reasoningText = nextThinking;
					flushCardUpdate();
				}''')

# 9) compaction clears prewarm status
rep('''				if (aggregatedToolTotal === 0) {
					compactionLine = buildCompactingLine();''','''				if (aggregatedToolTotal === 0) {
					clearPrewarmStatus();
					compactionLine = buildCompactingLine();''')

p.write_text(t,encoding="utf-8",newline="\n")
print("prewarm status applied")
