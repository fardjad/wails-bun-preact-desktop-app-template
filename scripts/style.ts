import { $ } from "bun";
import * as path from "node:path";
import {
  ensureBuildAssetsPresent,
  ensureEmbeddedDist,
  getGoBinToolPath,
  loadProjectConfig,
  pathExists,
  repoRoot,
  withLinuxPkgConfigEnv,
} from "./common";

const mode = process.argv[2];
if (mode !== "check" && mode !== "fix") {
  throw new Error("Usage: bun run scripts/style.ts <check|fix>");
}

const config = await loadProjectConfig();
await ensureBuildAssetsPresent();
await ensureEmbeddedDist(config);

const gitFilesRaw =
  await $`git ls-files -z --cached --others --exclude-standard`
    .cwd(repoRoot)
    .text();
const gitFiles = (
  await Promise.all(
    gitFilesRaw
      .split("\0")
      .filter(Boolean)
      .map(async (relativePath) =>
        (await pathExists(`${repoRoot}/${relativePath}`)) ? relativePath : null,
      ),
  )
).filter((value): value is string => value !== null);

const goFiles = gitFiles.filter((filePath) => filePath.endsWith(".go"));
const dprintFiles = gitFiles.filter((filePath) =>
  /\.(css|html|js|json|jsx|md|toml|ts|tsx|yaml|yml)$/.test(filePath),
);
const shellFiles = gitFiles.filter((filePath) =>
  /\.(bash|env|sh|zsh)$/.test(filePath),
);
const dockerFiles = gitFiles.filter((filePath) =>
  path.basename(filePath).includes("Dockerfile"),
);
const shfmtPath = await getGoBinToolPath("shfmt");
const dockerfmtPath = await getGoBinToolPath("dockerfmt");

if (mode === "check" && goFiles.length > 0) {
  const unformatted =
    await $`gofmt -l ${goFiles.map((filePath) => `${repoRoot}/${filePath}`)}`
      .cwd(repoRoot)
      .text();

  if (unformatted.trim()) {
    throw new Error(`Go files need formatting:\n${unformatted.trim()}`);
  }
}

if (mode === "fix" && goFiles.length > 0) {
  await $`gofmt -w ${goFiles.map((filePath) => `${repoRoot}/${filePath}`)}`.cwd(
    repoRoot,
  );
}

if (dprintFiles.length > 0) {
  if (mode === "check") {
    await $`bun x dprint check ${dprintFiles.map((filePath) => `${repoRoot}/${filePath}`)}`.cwd(
      repoRoot,
    );
  } else {
    await $`bun x dprint fmt ${dprintFiles.map((filePath) => `${repoRoot}/${filePath}`)}`.cwd(
      repoRoot,
    );
  }
}

if (shellFiles.length > 0) {
  if (mode === "check") {
    await $`${shfmtPath} -i 2 -d ${shellFiles.map((filePath) => `${repoRoot}/${filePath}`)}`.cwd(
      repoRoot,
    );
  } else {
    await $`${shfmtPath} -i 2 -w ${shellFiles.map((filePath) => `${repoRoot}/${filePath}`)}`.cwd(
      repoRoot,
    );
  }
}

if (dockerFiles.length > 0) {
  if (mode === "check") {
    await $`${dockerfmtPath} -d ${dockerFiles.map((filePath) => `${repoRoot}/${filePath}`)}`.cwd(
      repoRoot,
    );
  } else {
    await $`${dockerfmtPath} -w ${dockerFiles.map((filePath) => `${repoRoot}/${filePath}`)}`.cwd(
      repoRoot,
    );
  }
}

await $`go vet ./...`.cwd(repoRoot).env(withLinuxPkgConfigEnv());

if (mode === "check") {
  await $`bun run typecheck`.cwd(`${repoRoot}/frontend`);
}
