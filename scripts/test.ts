import { $ } from "bun";
import {
  ensureBuildAssetsPresent,
  ensureEmbeddedDist,
  ensureFrontendDependencies,
  generateBindings,
} from "./common";
import { getCurrentTarget, loadProjectConfig, repoRoot } from "./common";

const mode = process.argv[2] ?? "all";
const config = await loadProjectConfig();
const target = getCurrentTarget();

if (!["all", "frontend", "go"].includes(mode)) {
  throw new Error(`Unsupported test mode: ${mode}`);
}

await ensureBuildAssetsPresent();
await ensureFrontendDependencies();
await generateBindings("dev");

if (mode === "all" || mode === "frontend") {
  await $`bun test`.cwd(`${repoRoot}/frontend`);
}

if (mode === "all" || mode === "go") {
  await ensureEmbeddedDist(config);

  const env =
    target.os === "darwin"
      ? {
          MACOSX_DEPLOYMENT_TARGET: config.macOSDeploymentTarget,
          CGO_CFLAGS: `-mmacosx-version-min=${config.macOSDeploymentTarget}`,
          CGO_LDFLAGS: `-mmacosx-version-min=${config.macOSDeploymentTarget}`,
        }
      : undefined;

  await $`go test ./...`.cwd(repoRoot).env({ ...process.env, ...(env ?? {}) });
}
