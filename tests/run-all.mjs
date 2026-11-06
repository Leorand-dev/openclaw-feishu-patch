// Run all 2026.11.1 batch6 suites against one bundle.
// Usage: node run-all.mjs [bundle-path]
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const suites = [
  "test-helpers-1111.mjs",
  "test-aggregation-1111.mjs",
  "test-finalization-1111.mjs",
  "test-streaming-session-1111.mjs",
  "test-idle-hold-1111.mjs",
];
const bundle = process.argv[2] || path.join(dir, "../patches/2026.11.1/patched.mjs");

let passed = 0;
const failed = [];
for (const suite of suites) {
  console.log(`\n========== ${suite} ==========`);
  const result = spawnSync(process.execPath, [path.join(dir, suite), bundle], {
    stdio: "inherit",
    cwd: dir
  });
  if (result.status === 0) passed += 1;
  else failed.push(suite);
}

console.log(`\n${passed}/${suites.length} suites passed, ${failed.length} failed`);
if (failed.length > 0) console.log("failed: " + failed.join(", "));
process.exit(failed.length === 0 ? 0 : 1);
