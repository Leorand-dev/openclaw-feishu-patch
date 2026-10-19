import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\patches\2026.10.5\patched.mjs")
t=p.read_text(encoding="utf-8")
old='''			onAssistantMessageStart: previewStreamingEnabled ? () => {
				renderEpoch += 1;
				if (aggregatedToolTotal > 0) clearTransientStatusLines();
				else if (streamText.trim() || reasoningText.trim() || narrationLine) clearCardStatusLines();
				else if (!prewarmStatusLine && !waitingLine) {
					prewarmStatusLine = resolveProgressText("processing", "\\u270D\\uFE0F \\u6b63\\u5728\\u751f\\u6210\\u56de\\u590d\\u2026");
					waitingLine = prewarmStatusLine;
				}
				flushCardUpdate(true);
				return false;
			} : void 0,'''
new='''			onAssistantMessageStart: previewStreamingEnabled ? () => {
				renderEpoch += 1;
				if (aggregatedToolTotal > 0) clearTransientStatusLines();
				else if (streamText.trim() || reasoningText.trim()) clearCardStatusLines();
				else {
					// No assistant content yet: drop transient item/narration lines but keep
					// the initial "processing" status until the first token/tool arrives.
					itemStatusLine = "";
					compactionLine = "";
					narrationLine = "";
					if (!prewarmStatusLine && !waitingLine) {
						prewarmStatusLine = resolveProgressText("processing", "\\u270D\\uFE0F \\u6b63\\u5728\\u751f\\u6210\\u56de\\u590d\\u2026");
						waitingLine = prewarmStatusLine;
					}
				}
				flushCardUpdate(true);
				return false;
			} : void 0,'''
assert old in t
p.write_text(t.replace(old,new,1),encoding="utf-8",newline="\n")
print("assistant branch adjusted")
