import {
  binaryNameForTarget,
  buildBinDir,
  getCurrentTarget,
  loadProjectConfig,
} from "./common";
import * as path from "node:path";

const config = await loadProjectConfig();
const target = getCurrentTarget();
const binaryPath = path.join(
  buildBinDir,
  binaryNameForTarget(config.slug, target.os),
);

// Launch the dev binary as the direct child process instead of via Bun Shell.
//
// Why this matters:
// - `await $`${binaryPath}`` does not execute the GUI app directly; it routes
//   the launch through Bun Shell first.
// - In this repo's Wails dev flow on Windows, that extra shell layer changes
//   the launch behavior enough that the Wails webview window never becomes a
//   visible top-level `WailsWebviewWindow`, even though the exact same `.exe`
//   works when launched directly.
// - `Bun.spawn([binaryPath])` keeps the app process as the direct child, which
//   matches the behavior that successfully shows the dev window on Windows.
//
// Do not "simplify" this back to `$` unless Windows dev mode is re-verified.
const processHandle = Bun.spawn([binaryPath], {
  cwd: path.dirname(binaryPath),
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const exitCode = await processHandle.exited;

if (exitCode !== 0) {
  process.exit(exitCode);
}
