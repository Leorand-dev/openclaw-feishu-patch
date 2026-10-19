import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\README.md")
t=p.read_text(encoding="utf-8")
old='''6. **Status-line ownership** — while a tool batch is active, per-item tool /
   command / patch / search / api progress lines and compaction lines do not
   overwrite the waiting line.'''
new='''6. **Status-line ownership** — while a tool batch is active, per-item tool /
   command / patch / search / api progress lines and compaction lines do not
   overwrite the waiting line. The waiting line now persists through assistant
   message starts/segments (only transient item/compaction/narration lines are
   cleared) and is removed only on final delivery or card close, so it updates
   continuously instead of blinking out between tools.'''
assert old in t
t=t.replace(old,new,1)
p.write_text(t,encoding="utf-8",newline="\n")
print("README updated")
