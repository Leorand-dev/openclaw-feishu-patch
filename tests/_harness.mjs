// Shared helpers for the 2026.11.1 test suites.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testsDir = path.dirname(fileURLToPath(import.meta.url));

export function loadBundle(argv = process.argv) {
  const file = argv[2] || process.env.BUNDLE || path.join(testsDir, "../patches/2026.11.1/patched.mjs");
  return fs.readFileSync(file, "utf8");
}

/** Extract `const name = (...) => { ... };` verbatim (closing line must be "\t};"). */
export function extractArrow(src, name) {
  const head = `const ${name} = (`;
  const start = src.indexOf(head);
  if (start < 0) throw new Error(`missing function: ${name}`);
  const end = src.indexOf("\n\t};", start);
  if (end < 0) throw new Error(`unterminated function: ${name}`);
  return src.slice(start, end + 4);
}

export function extractAsyncArrow(src, name) {
  const head = `const ${name} = async (`;
  const start = src.indexOf(head);
  if (start < 0) throw new Error(`missing async function: ${name}`);
  const end = src.indexOf("\n\t};", start);
  if (end < 0) throw new Error(`unterminated async function: ${name}`);
  return src.slice(start, end + 4);
}

/**
 * Extract `var Name = class { ... }` by balancing braces from the class body.
 * Independent of the upstream section-comment style (`// <path>` vs
 * `//#region <path>`), which broke the older marker-based slice in 2026.11.2.
 * Skips line/block comments and string/template/regex-free spans conservatively.
 */
export function extractClass(src, header) {
  const start = src.indexOf(header);
  if (start < 0) throw new Error(`missing class header: ${header}`);
  const open = src.indexOf("{", start);
  if (open < 0) throw new Error(`missing class body: ${header}`);
  let depth = 0;
  let quote = "";
  let i = open;
  while (i < src.length) {
    const ch = src[i];
    if (quote) {
      if (ch === "\\") { i += 2; continue; }
      if (ch === quote) quote = "";
      i += 1;
      continue;
    }
    if (ch === "/" && src[i + 1] === "/") {
      const nl = src.indexOf("\n", i);
      i = nl < 0 ? src.length : nl;
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end < 0 ? src.length : end + 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; i += 1; continue; }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
    i += 1;
  }
  throw new Error(`unbalanced class body: ${header}`);
}

export function extractOnIdleBody(src) {
  const m = src.match(/onIdle: \(\) => \{([\s\S]*?)\n\t\t\},/);
  if (!m) throw new Error("onIdle not found");
  return m[1];
}

export function extractBareToolLabels(src) {
  const m = src.match(/const BARE_TOOL_LABELS = [\s\S]*?\]\);/);
  if (!m) throw new Error("BARE_TOOL_LABELS not found");
  return m[0];
}

export function extractIconMap(src) {
  const m = src.match(/const TOOL_ICON_BY_LABEL = [\s\S]*?\]\);/);
  if (!m) throw new Error("TOOL_ICON_BY_LABEL not found");
  return m[0];
}

export function extractNarrationPrefix(src) {
  const m = src.match(/const TOOL_NARRATION_TEXT_PREFIX = [^\n]+/);
  if (!m) throw new Error("TOOL_NARRATION_TEXT_PREFIX not found");
  return m[0];
}

/** One-line `const NAME = ...;` declaration (e.g. prefix, alias map, max chars). */
export function extractConstLine(src, name) {
  const m = src.match(new RegExp(`const ${name} = [^\\n]+`));
  if (!m) throw new Error(`${name} line not found`);
  return m[0];
}

/** Closure preamble needed to execute the tool-summary parsers. */
export function buildParserEnv(src) {
  return [
    extractIconMap(src),
    extractConstLine(src, "TOOL_NARRATION_TEXT_PREFIX"),
    extractConstLine(src, "TOOL_LABEL_ALIASES"),
    extractArrow(src, "normalizeToolLabel"),
    extractConstLine(src, "resolveToolIcon"),
    extractConstLine(src, "TOOL_SUMMARY_MAX_CHARS"),
    extractArrow(src, "getToolSummaryText"),
  ].join("\n");
}

export function count(src, needle) {
  return src.split(needle).length - 1;
}

export function makeCounter() {
  let pass = 0;
  let fail = 0;
  const ok = (name, cond, detail = "") => {
    if (cond) {
      pass += 1;
      console.log("PASS  " + name);
    } else {
      fail += 1;
      console.log("FAIL  " + name + (detail ? " — " + detail : ""));
    }
  };
  const finish = (label = "") => {
    console.log(`\n${pass} passed, ${fail} failed${label ? " (" + label + ")" : ""}`);
    process.exit(fail === 0 ? 0 : 1);
  };
  return { ok, finish };
}
