import { $ } from "bun";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  buildConfigPath,
  ensureDirectory,
  ensureAppIconExists,
  ensureBuildAssetsPresent,
  ensureFrontendDependencies,
  frontendIndexHtmlPath,
  frontendMetadataPath,
  frontendPackageJsonPath,
  generateBindings,
  generateLinuxDesktopEntry,
  generatePlatformIcons,
  goMetadataPath,
  goModPath,
  loadProjectConfig,
  readJsonFile,
  releaseDir,
  removeIfExists,
  repoRoot,
  writeJsonFile,
  writeTextIfChanged,
} from "./common";

const appImageBuildScript = `#!/usr/bin/env bash
set -euxo pipefail

APP_DIR="\${APP_NAME}.AppDir"

mkdir -p "\${APP_DIR}/usr/bin"
cp -r "\${APP_BINARY}" "\${APP_DIR}/usr/bin/"
cp "\${ICON_PATH}" "\${APP_DIR}/"
cp "\${DESKTOP_FILE}" "\${APP_DIR}/"

if [[ $(uname -m) == *x86_64* ]]; then
  wget -q -4 -N https://github.com/linuxdeploy/linuxdeploy/releases/download/continuous/linuxdeploy-x86_64.AppImage
  chmod +x linuxdeploy-x86_64.AppImage
  ./linuxdeploy-x86_64.AppImage --appdir "\${APP_DIR}" --output appimage
else
  wget -q -4 -N https://github.com/linuxdeploy/linuxdeploy/releases/download/continuous/linuxdeploy-aarch64.AppImage
  chmod +x linuxdeploy-aarch64.AppImage
  ./linuxdeploy-aarch64.AppImage --appdir "\${APP_DIR}" --output appimage
fi

mv "\${APP_NAME}"*.AppImage "\${APP_NAME}.AppImage"
`;

function buildGoMetadataFile(
  config: Awaited<ReturnType<typeof loadProjectConfig>>,
) {
  return [
    "package main",
    "",
    "const (",
    `\tappProductName       = ${JSON.stringify(config.info.productName)}`,
    `\tappProductIdentifier = ${JSON.stringify(config.info.productIdentifier)}`,
    `\tappDescription       = ${JSON.stringify(config.info.description)}`,
    `\tappProgramName       = ${JSON.stringify(config.slug)}`,
    ")",
    "",
  ].join("\n");
}

function buildFrontendMetadataFile(
  config: Awaited<ReturnType<typeof loadProjectConfig>>,
) {
  return [
    `export const appProductName = ${JSON.stringify(config.info.productName)};`,
    `export const appProductIdentifier = ${JSON.stringify(config.info.productIdentifier)};`,
    `export const appDescription = ${JSON.stringify(config.info.description)};`,
    `export const appProgramName = ${JSON.stringify(config.slug)};`,
    "",
  ].join("\n");
}

async function syncGoModule(
  config: Awaited<ReturnType<typeof loadProjectConfig>>,
) {
  const goMod = await Bun.file(goModPath).text();
  const next = goMod.replace(/^module\s+.+$/m, `module ${config.slug}`);
  await writeTextIfChanged(goModPath, next);
}

async function syncFrontendPackage(
  config: Awaited<ReturnType<typeof loadProjectConfig>>,
) {
  const frontendPackage = await readJsonFile<Record<string, unknown>>(
    frontendPackageJsonPath,
  );

  frontendPackage.name = config.frontendPackageName;
  frontendPackage.version = config.info.version;

  await writeJsonFile(frontendPackageJsonPath, frontendPackage);
}

async function syncFrontendIndexHtml(
  config: Awaited<ReturnType<typeof loadProjectConfig>>,
) {
  const indexHtml = await Bun.file(frontendIndexHtmlPath).text();
  const next = indexHtml.replace(
    /<title>.*<\/title>/,
    `<title>${config.info.productName}</title>`,
  );
  await writeTextIfChanged(frontendIndexHtmlPath, next);
}

async function updateBuildAssets(
  config: Awaited<ReturnType<typeof loadProjectConfig>>,
) {
  await ensureAppIconExists();
  await $`wails3 update build-assets -config ${buildConfigPath} -dir build -name ${config.info.productName} -binaryname ${config.slug} -productcompany ${config.info.companyName} -productname ${config.info.productName} -productidentifier ${config.info.productIdentifier} -productdescription ${config.info.description} -productcopyright ${config.info.copyright} -productcomments ${config.info.comments} -productversion ${config.info.version}`.cwd(
    repoRoot,
  );
}

async function ensureManualBuildAssets() {
  const linuxAppImageBuildScriptPath = path.join(
    repoRoot,
    "build",
    "linux",
    "appimage",
    "build.sh",
  );

  await ensureDirectory(path.dirname(linuxAppImageBuildScriptPath));
  await writeTextIfChanged(linuxAppImageBuildScriptPath, appImageBuildScript);
  await fs.chmod(linuxAppImageBuildScriptPath, 0o755);
}

async function pruneUnsupportedGeneratedFiles() {
  const generatedPathsToRemove = [
    path.join(repoRoot, "Taskfile.yml"),
    path.join(repoRoot, "build", "Taskfile.yml"),
    path.join(repoRoot, "build", "android"),
    path.join(repoRoot, "build", "ios"),
    path.join(repoRoot, "build", "docker"),
    path.join(repoRoot, "build", "linux", "Taskfile.yml"),
    path.join(repoRoot, "build", "linux", "desktop"),
    path.join(repoRoot, "build", "linux", "nfpm"),
    path.join(repoRoot, "build", "windows", "Taskfile.yml"),
    path.join(repoRoot, "build", "windows", "msix"),
    path.join(repoRoot, "build", "windows", "nsis"),
    path.join(repoRoot, "build", "darwin", "Taskfile.yml"),
    path.join(repoRoot, "frontend", "package.json.md5"),
    releaseDir,
  ];

  for (const generatedPath of generatedPathsToRemove) {
    await removeIfExists(generatedPath);
  }
}

const config = await loadProjectConfig();

await syncGoModule(config);
await writeTextIfChanged(goMetadataPath, buildGoMetadataFile(config));
await syncFrontendPackage(config);
await writeTextIfChanged(
  frontendMetadataPath,
  buildFrontendMetadataFile(config),
);
await syncFrontendIndexHtml(config);
await ensureFrontendDependencies();
await updateBuildAssets(config);
await pruneUnsupportedGeneratedFiles();
await ensureManualBuildAssets();
await ensureBuildAssetsPresent();
await generatePlatformIcons();
await generateLinuxDesktopEntry(config);
await $`gofmt -w ${goMetadataPath}`.cwd(repoRoot);
await $`go mod tidy`.cwd(repoRoot);
await generateBindings("dev", { clean: true });
await $`bunx dprint fmt ${path.join(repoRoot, "build", "windows", "info.json")} ${frontendMetadataPath}`.cwd(
  repoRoot,
);
