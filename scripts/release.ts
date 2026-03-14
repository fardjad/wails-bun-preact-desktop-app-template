import { $ } from "bun";
import { parseArgs } from "node:util";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  adHocSignMacOSApp,
  binaryOutputPath,
  buildFrontendBundle,
  cleanupWindowsSyso,
  createMacOSAppBundle,
  ensureBuildAssetsPresent,
  ensureFrontendDependencies,
  generateBindings,
  generateLinuxDesktopEntry,
  generatePlatformIcons,
  generateWindowsSyso,
  runGoBuild,
  writeChecksumFile,
  zipMacOSApp,
} from "./common";
import {
  artifactBaseName,
  buildAppIconPath,
  buildBinDir,
  buildDarwinDir,
  ensureDirectory,
  GoArch,
  linuxAppImageDir,
  loadProjectConfig,
  pathExists,
  releaseDir,
  repoRoot,
} from "./common";

type ReleaseTargetOS = "windows" | "linux" | "macos";
type ReleaseArch = GoArch | "universal";

function parseReleaseArgs() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      "amd64-binary": {
        type: "string",
      },
      "arm64-binary": {
        type: "string",
      },
    },
    allowPositionals: true,
    strict: true,
  });

  const [targetOS, targetArch] = positionals as [
    ReleaseTargetOS | undefined,
    ReleaseArch | undefined,
  ];

  if (!targetOS || !targetArch) {
    throw new Error(
      "Usage: bun run release <windows|linux|macos> <amd64|arm64|universal> [--amd64-binary <path>] [--arm64-binary <path>]",
    );
  }

  return { targetOS, targetArch, values };
}

async function releaseWindows(
  config: Awaited<ReturnType<typeof loadProjectConfig>>,
  targetArch: GoArch,
) {
  const artifactBase = artifactBaseName(
    config.slug,
    "windows",
    targetArch,
    config.info.version,
  );
  const artifactPath = path.join(releaseDir, `${artifactBase}.exe`);

  await ensureFrontendDependencies();
  await generateBindings("release");
  await buildFrontendBundle();
  await generateWindowsSyso(targetArch);

  try {
    await runGoBuild(
      config,
      { os: "windows", arch: targetArch },
      "release",
      artifactPath,
    );
  } finally {
    await cleanupWindowsSyso(targetArch);
  }

  await writeChecksumFile(artifactPath);
}

async function releaseLinux(
  config: Awaited<ReturnType<typeof loadProjectConfig>>,
  targetArch: GoArch,
) {
  const artifactBase = artifactBaseName(
    config.slug,
    "linux",
    targetArch,
    config.info.version,
  );
  const tempOutputDir = path.join(releaseDir, "tmp", `linux-${targetArch}`);
  const finalArtifactPath = path.join(releaseDir, `${artifactBase}.AppImage`);
  const tempBinaryPath = path.join(
    buildBinDir,
    `${config.slug}-linux-${targetArch}`,
  );
  const stagingBinaryName = config.slug;
  const stagingIconName = `${config.slug}.png`;
  const stagingDesktopName = `${config.slug}.desktop`;
  const stagingBinaryPath = path.join(linuxAppImageDir, stagingBinaryName);
  const stagingIconPath = path.join(linuxAppImageDir, stagingIconName);
  const stagingDesktopPath = path.join(linuxAppImageDir, stagingDesktopName);
  const buildScriptPath = path.join(linuxAppImageDir, "build.sh");

  if (!(await pathExists(buildScriptPath))) {
    throw new Error(
      `Missing AppImage build helper at ${buildScriptPath}. Run \`bun run sync-app-config\` first.`,
    );
  }

  await ensureFrontendDependencies();
  await generateBindings("release");
  await buildFrontendBundle();
  const desktopFilePath = await generateLinuxDesktopEntry(config);
  await ensureDirectory(tempOutputDir);
  await runGoBuild(
    config,
    { os: "linux", arch: targetArch },
    "release",
    tempBinaryPath,
  );

  await Bun.write(stagingBinaryPath, Bun.file(tempBinaryPath));
  await Bun.write(stagingIconPath, Bun.file(buildAppIconPath));
  await Bun.write(stagingDesktopPath, Bun.file(desktopFilePath));

  try {
    await $`wails3 generate appimage -binary ${stagingBinaryName} -icon ${stagingIconName} -desktopfile ${stagingDesktopName} -outputdir ${tempOutputDir} -builddir ${path.join(linuxAppImageDir, "build")}`.cwd(
      linuxAppImageDir,
    );
  } finally {
    await fs.rm(stagingBinaryPath, { force: true });
    await fs.rm(stagingIconPath, { force: true });
    await fs.rm(stagingDesktopPath, { force: true });
  }

  const tempArtifacts = (await fs.readdir(tempOutputDir))
    .filter((fileName) => fileName.endsWith(".AppImage"))
    .map((fileName) => path.join(tempOutputDir, fileName));

  if (tempArtifacts.length !== 1) {
    throw new Error(
      `Expected exactly one AppImage in ${tempOutputDir}, found ${tempArtifacts.length}.`,
    );
  }

  await fs.rm(finalArtifactPath, { force: true });
  await fs.rename(tempArtifacts[0], finalArtifactPath);
  await fs.chmod(finalArtifactPath, 0o755);
  await fs.rm(tempOutputDir, { force: true, recursive: true });
  await writeChecksumFile(finalArtifactPath);
}

async function releaseMacOS(
  config: Awaited<ReturnType<typeof loadProjectConfig>>,
  targetArch: GoArch,
) {
  const artifactBase = artifactBaseName(
    config.slug,
    "darwin",
    targetArch,
    config.info.version,
  );
  const binaryOutputDir = path.join(releaseDir, "binaries");
  const binaryPath = path.join(binaryOutputDir, `${artifactBase}.bin`);
  const appBundlePath = path.join(releaseDir, `${config.info.productName}.app`);
  const zipPath = path.join(releaseDir, `${artifactBase}.app.zip`);

  await ensureFrontendDependencies();
  await generateBindings("release");
  await buildFrontendBundle();
  await generatePlatformIcons();
  await ensureDirectory(binaryOutputDir);
  await runGoBuild(
    config,
    { os: "darwin", arch: targetArch },
    "release",
    binaryPath,
  );
  await createMacOSAppBundle(
    config,
    binaryPath,
    appBundlePath,
    path.join(buildDarwinDir, "Info.plist"),
  );
  await adHocSignMacOSApp(appBundlePath);
  await zipMacOSApp(appBundlePath, zipPath);
  await writeChecksumFile(zipPath);
}

async function releaseMacOSUniversal(
  config: Awaited<ReturnType<typeof loadProjectConfig>>,
  amd64BinaryPath: string,
  arm64BinaryPath: string,
) {
  const artifactBase = artifactBaseName(
    config.slug,
    "darwin",
    "universal",
    config.info.version,
  );
  const universalBinaryPath = path.join(
    releaseDir,
    "binaries",
    `${artifactBase}.bin`,
  );
  const appBundlePath = path.join(releaseDir, `${config.info.productName}.app`);
  const zipPath = path.join(releaseDir, `${artifactBase}.app.zip`);

  await generatePlatformIcons();
  await ensureDirectory(path.dirname(universalBinaryPath));
  await $`lipo -create -output ${universalBinaryPath} ${amd64BinaryPath} ${arm64BinaryPath}`;
  await createMacOSAppBundle(
    config,
    universalBinaryPath,
    appBundlePath,
    path.join(buildDarwinDir, "Info.plist"),
  );
  await adHocSignMacOSApp(appBundlePath);
  await zipMacOSApp(appBundlePath, zipPath);
  await writeChecksumFile(zipPath);
}

const { targetOS, targetArch, values } = parseReleaseArgs();
const config = await loadProjectConfig();

await ensureBuildAssetsPresent();
await ensureDirectory(releaseDir);

if (targetOS === "windows" && targetArch !== "universal") {
  await releaseWindows(config, targetArch);
  process.exit(0);
}

if (targetOS === "linux" && targetArch !== "universal") {
  await releaseLinux(config, targetArch);
  process.exit(0);
}

if (targetOS === "macos" && targetArch !== "universal") {
  await releaseMacOS(config, targetArch);
  process.exit(0);
}

if (targetOS === "macos" && targetArch === "universal") {
  const amd64BinaryPath = values["amd64-binary"];
  const arm64BinaryPath = values["arm64-binary"];

  if (!amd64BinaryPath || !arm64BinaryPath) {
    throw new Error(
      "macos universal release requires --amd64-binary and --arm64-binary.",
    );
  }

  await releaseMacOSUniversal(config, amd64BinaryPath, arm64BinaryPath);
  process.exit(0);
}

throw new Error(`Unsupported release target: ${targetOS} ${targetArch}`);
