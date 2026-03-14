import {
  binaryOutputPath,
  cleanupWindowsSyso,
  ensureBuildAssetsPresent,
  ensureEmbeddedDist,
  ensureFrontendDependencies,
  generateBindings,
  generateWindowsSyso,
  runGoBuild,
} from "./common";
import { getCurrentTarget, loadProjectConfig } from "./common";

const config = await loadProjectConfig();
const target = getCurrentTarget();
const outputPath = await binaryOutputPath(config, target);

await ensureBuildAssetsPresent();
await ensureFrontendDependencies();
await generateBindings("dev");
await ensureEmbeddedDist(config);

if (target.os === "windows") {
  await generateWindowsSyso(target.arch);
}

try {
  await runGoBuild(config, target, "dev", outputPath);
} finally {
  if (target.os === "windows") {
    await cleanupWindowsSyso(target.arch);
  }
}
