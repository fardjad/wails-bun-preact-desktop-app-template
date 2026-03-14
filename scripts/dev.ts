import { $ } from "bun";
import { buildConfigPath, loadProjectConfig, repoRoot } from "./common";

const config = await loadProjectConfig();

await $`wails3 dev -config ${buildConfigPath} -port ${String(config.vitePort)}`.cwd(
  repoRoot,
);
