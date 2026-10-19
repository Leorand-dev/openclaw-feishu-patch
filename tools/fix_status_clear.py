import pathlib
p=pathlib.Path(r"D:\deepseek\review-wayE\fixed\patches\2026.10.5\patched.mjs")
t=p.read_text(encoding="utf-8")
# 1) writeStatusContent: map empty content to zero-width marker
old='''	async writeStatusContent(text) {
		if (!this.state || !this.statusElementEnabled) return false;
		this.state.sequence += 1;'''
new='''	async writeStatusContent(text) {
		if (!this.state || !this.statusElementEnabled) return false;
		// CardKit rejects empty element content (HTTP 400 / field validation failed).
		const safeText = typeof text === "string" && text.trim() !== "" ? text : "\\u200B";
		this.state.sequence += 1;'''
assert old in t
t=t.replace(old,new,1)
# body content uses safeText
old2='''			await this.requestCardKit(`/${this.state.cardId}/elements/status/content`, "status-update", "PUT", () => ({
				content: text,'''
new2='''			await this.requestCardKit(`/${this.state.cardId}/elements/status/content`, "status-update", "PUT", () => ({
				content: safeText,'''
assert old2 in t
t=t.replace(old2,new2,1)
# 2) updateStatus: normalize empty to marker before dedupe/throttle
old3='''	async updateStatus(text) {
		if (!this.state || this.closed || !this.statusElementEnabled || this.statusUnavailable || typeof text !== "string") return true;
		if (text === this.statusSentText && text === this.statusPendingText) return true;
		this.statusPendingText = text;
		this.clearStatusFlushTimer();
		const shouldForce = shouldPushStreamingUpdate(this.statusSentText, text);
		const now = Date.now();
		if (!shouldForce && now - this.statusLastUpdateTime < this.updateThrottleMs) {
			this.schedulePendingStatusFlush();
			return true;
		}
		this.statusLastUpdateTime = now;
		return await this.flushPendingStatusUpdate();
	}'''
new3='''	async updateStatus(text) {
		if (!this.state || this.closed || !this.statusElementEnabled || this.statusUnavailable || typeof text !== "string") return true;
		const safeText = text.trim() !== "" ? text : "\\u200B";
		if (safeText === this.statusSentText && safeText === this.statusPendingText) return true;
		this.statusPendingText = safeText;
		this.clearStatusFlushTimer();
		const shouldForce = shouldPushStreamingUpdate(this.statusSentText, safeText);
		const now = Date.now();
		if (!shouldForce && now - this.statusLastUpdateTime < this.updateThrottleMs) {
			this.schedulePendingStatusFlush();
			return true;
		}
		this.statusLastUpdateTime = now;
		return await this.flushPendingStatusUpdate();
	}'''
assert old3 in t
t=t.replace(old3,new3,1)
# 3) close: clear with marker, not empty
old4='''		if (this.statusElementEnabled && this.statusSentText !== "") {
			this.statusSentText = "";
			await this.writeStatusContent("").catch(() => false);
		}'''
new4='''		if (this.statusElementEnabled && this.statusSentText !== "\\u200B") {
			this.statusSentText = "\\u200B";
			await this.writeStatusContent("\\u200B").catch(() => false);
		}'''
assert old4 in t
t=t.replace(old4,new4,1)
p.write_text(t,encoding="utf-8",newline="\n")
print("status clear fix applied")
