import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\README.md")
t=p.read_text(encoding="utf-8")
old='''**Status element validation:** the dedicated `status` element uses the
CardKit element-content update endpoint. If the target client/API rejects it,
the session marks status unavailable and automatically falls back to rendering
status inside the content element; live verification is still recommended after
deployment. Set `cardStatusElement: false` to force the content-only path.'''
new='''**Status element validation:** CardKit rejects empty element content
(HTTP 400 / `99992402 field validation failed`), so clearing the status uses a
zero-width-space marker. A direct CardKit API probe verified create/update/clear
for the `status` element in streaming mode. If a live call still fails, the
session marks status unavailable and automatically falls back to rendering
status inside the content element. Set `cardStatusElement: false` to force the
content-only path.'''
assert old in t
p.write_text(t.replace(old,new,1),encoding="utf-8",newline="\n")
print("README updated")
