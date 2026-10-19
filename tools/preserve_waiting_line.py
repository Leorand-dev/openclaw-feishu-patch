import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\patches\2026.10.5\patched.mjs")
t=p.read_text(encoding="utf-8")

def rep(old,new):
    global t
    assert t.count(old)==1, old[:120]
    t=t.replace(old,new,1)

# 1) transient clear helper that keeps the tool waiting line
rep('''	const clearCardStatusLines = () => {
		waitingLine = "";
		itemStatusLine = "";
		compactionLine = "";
		narrationLine = "";
		prewarmStatusLine = "";
	};''','''	const clearTransientStatusLines = () => {
		itemStatusLine = "";
		compactionLine = "";
		narrationLine = "";
		if (prewarmStatusLine) {
			if (waitingLine === prewarmStatusLine) waitingLine = "";
			prewarmStatusLine = "";
		}
	};
	const clearCardStatusLines = () => {
		waitingLine = "";
		itemStatusLine = "";
		compactionLine = "";
		narrationLine = "";
		prewarmStatusLine = "";
	};''')

# 2) assistant start: keep tool waiting line, clear only transient lines
rep('''			onAssistantMessageStart: previewStreamingEnabled ? () => {
				renderEpoch += 1;
				clearCardStatusLines();
				flushCardUpdate(true);
				return false;
			} : void 0,''','''			onAssistantMessageStart: previewStreamingEnabled ? () => {
				renderEpoch += 1;
				if (aggregatedToolTotal > 0) clearTransientStatusLines();
				else clearCardStatusLines();
				flushCardUpdate(true);
				return false;
			} : void 0,''')

p.write_text(t,encoding="utf-8",newline="\n")
print("waiting-line persistence applied")
