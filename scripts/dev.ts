import { $ } from "bun";
import {
  buildConfigPath,
  getWailsCliPath,
  loadProjectConfig,
  repoRoot,
  withLinuxPkgConfigEnv,
} from "./common";

const config = await loadProjectConfig();
const wailsCliPath = await getWailsCliPath();

await $`${wailsCliPath} dev -config ${buildConfigPath} -port ${String(config.vitePort)}`
  .cwd(repoRoot)
  .env(withLinuxPkgConfigEnv());
