# -*- coding: utf-8 -*-
"""Prevent cleanup/final races from leaving two cards:
- defer onCleanup card close by a short grace window and cancel it when a
  delivery starts;
- if a final delivery ends up on a static/post path while a streaming card is
  still active, discard that preview first.
"""
import pathlib

P = pathlib.Path(r"D:\deepseek\review-wayE\fixed\patches\2026.10.5\patched.mjs")
t = P.read_text(encoding="utf-8")


def rep(old, new):
    global t
    assert t.count(old) == 1, old[:180]
    t = t.replace(old, new, 1)


# state
import re
m = re.search(r'(\tlet finalDeliveryInProgress = false;\n)', t)
assert m
t = t[:m.end()] + '\tlet cleanupCloseTimer;\n\tconst CLEANUP_CLOSE_GRACE_MS = 2e3;\n' + t[m.end():]

# helpers near waiting refresh timer
rep('''	const clearPrewarmStatus = () => {
		if (!prewarmStatusLine) return;''','''	const clearCleanupCloseTimer = () => {
		if (cleanupCloseTimer !== void 0) {
			clearTimeout(cleanupCloseTimer);
			cleanupCloseTimer = void 0;
		}
	};
	const scheduleCleanupClose = () => {
		if (cleanupCloseTimer !== void 0) return;
		cleanupCloseTimer = setTimeout(() => {
			cleanupCloseTimer = void 0;
			if (streaming?.isActive() === true && !finalDeliveryInProgress) {
				queueIdleSideEffects().catch((error) => params.runtime.error?.(`feishu[${account.accountId}] cleanup card finalization failed: ${String(error)}`));
			}
		}, CLEANUP_CLOSE_GRACE_MS);
		cleanupCloseTimer.unref?.();
	};
	const clearPrewarmStatus = () => {
		if (!prewarmStatusLine) return;''')

# deliver entry: a new delivery means cleanup should not race it
rep('''				const isFinalDelivery = info?.kind === "final";
				if (isFinalDelivery) {''','''				clearCleanupCloseTimer();
				const isFinalDelivery = info?.kind === "final";
				if (isFinalDelivery) {''')

# onCleanup: defer instead of immediate close
rep('''		onCleanup: () => {
			typingCallbacks?.onCleanup?.();
			if (streaming?.isActive() === true && !finalDeliveryInProgress) {
				queueIdleSideEffects().catch((error) => params.runtime.error?.(`feishu[${account.accountId}] cleanup card finalization failed: ${String(error)}`));
			}
		}''','''		onCleanup: () => {
			typingCallbacks?.onCleanup?.();
			if (streaming?.isActive() === true && !finalDeliveryInProgress) {
				// Final delivery can arrive just after cleanup; defer the close so the
				// final answer can still stream into this card. A subsequent delivery
				// cancels the timer.
				scheduleCleanupClose();
			}
		}''')

# presentation card branch: discard an active preview first
rep('''				if (presentationCard) {
					if (hasMedia) await collectDelivery(sendMediaReplies(payload));''','''				if (presentationCard) {
					if (info?.kind === "final" && streaming?.isActive() === true) await discardStreamingPreview();
					if (hasMedia) await collectDelivery(sendMediaReplies(payload));''')

# static/post final fallback: discard active preview first
rep('''					if (useStaticCard || useStreamingCard && !isStreamingStartBackedOff(account.accountId) && withinCardTableLimit(text)) deliveredResults.push(await sendChunkedTextReply({''','''					if (info?.kind === "final" && streaming?.isActive() === true) await discardStreamingPreview();
					if (useStaticCard || useStreamingCard && !isStreamingStartBackedOff(account.accountId) && withinCardTableLimit(text)) deliveredResults.push(await sendChunkedTextReply({''')

# clear cleanup timer on reset/reply start/close
t = t.replace('''		prewarmRequested = false;
		prewarmStatusLine = "";''','''		prewarmRequested = false;
		prewarmStatusLine = "";
		clearCleanupCloseTimer();''',2)

P.write_text(t, encoding="utf-8", newline="\n")
print("cleanup/final race guards applied")
