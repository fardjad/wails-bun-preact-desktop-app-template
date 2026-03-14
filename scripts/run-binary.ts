import {
  binaryNameForTarget,
  buildBinDir,
  getCurrentTarget,
  loadProjectConfig,
} from "./common";
import { $ } from "bun";

const config = await loadProjectConfig();
const target = getCurrentTarget();
const binaryPath = `${buildBinDir}/${binaryNameForTarget(config.slug, target.os)}`;

await $`${binaryPath}`;
