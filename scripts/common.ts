import { $, Glob, YAML } from "bun";
import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export type GoOS = "darwin" | "linux" | "windows";
export type GoArch = "amd64" | "arm64";
export type BuildMode = "dev" | "release";

type BuildInfo = {
  companyName: string;
  productName: string;
  productIdentifier: string;
  description: string;
  copyright: string;
  comments: string;
  version: string;
};

type BuildConfigFile = {
  info: BuildInfo;
};

export type ProjectConfig = {
  info: BuildInfo;
  slug: string;
  frontendPackageName: string;
  vitePort: number;
  macOSDeploymentTarget: string;
};

export const repoRoot = path.resolve(import.meta.dir, "..");
export const buildConfigPath = path.join(repoRoot, "build", "config.yml");
export const buildDir = path.join(repoRoot, "build");
export const buildBinDir = path.join(buildDir, "bin");
export const releaseDir = path.join(buildDir, "release");
export const frontendDir = path.join(repoRoot, "frontend");
export const frontendDistDir = path.join(frontendDir, "dist");
export const frontendPackageJsonPath = path.join(frontendDir, "package.json");
export const frontendIndexHtmlPath = path.join(frontendDir, "index.html");
export const frontendMetadataPath = path.join(
  frontendDir,
  "src",
  "lib",
  "app-metadata.ts",
);
export const frontendBindingsDir = path.join(frontendDir, "bindings");
export const goModPath = path.join(repoRoot, "go.mod");
export const goMetadataPath = path.join(repoRoot, "app_metadata.go");
export const buildAppIconPath = path.join(buildDir, "appicon.png");
export const buildDarwinDir = path.join(buildDir, "darwin");
export const buildLinuxDir = path.join(buildDir, "linux");
export const buildWindowsDir = path.join(buildDir, "windows");
export const linuxAppImageDir = path.join(buildLinuxDir, "appimage");

function deriveSlug(productName: string) {
  const asciiName = productName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const slug = asciiName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  if (!slug) {
    throw new Error(
      `Unable to derive a slug from productName ${JSON.stringify(productName)}.`,
    );
  }

  return slug;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function loadProjectConfig(): Promise<ProjectConfig> {
  const parsedConfig: unknown = YAML.parse(
    await Bun.file(buildConfigPath).text(),
  );

  if (!isRecord(parsedConfig)) {
    throw new Error(
      `Expected ${buildConfigPath} to contain a single YAML object.`,
    );
  }

  const info = parsedConfig.info;

  if (!isRecord(info)) {
    throw new Error(`Missing or invalid build metadata section at info.`);
  }

  const validatedInfo = {} as BuildInfo;

  for (const key of [
    "companyName",
    "productName",
    "productIdentifier",
    "description",
    "copyright",
    "comments",
    "version",
  ] as const) {
    if (typeof info[key] !== "string" || !info[key].trim()) {
      throw new Error(`Missing build metadata field info.${key}.`);
    }

    validatedInfo[key] = info[key];
  }

  const buildConfig: BuildConfigFile = {
    info: validatedInfo,
  };

  return {
    info: buildConfig.info,
    slug: deriveSlug(buildConfig.info.productName),
    frontendPackageName: `${deriveSlug(buildConfig.info.productName)}-frontend`,
    vitePort: 34115,
    macOSDeploymentTarget: "15.5",
  };
}

export async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDirectory(targetPath: string) {
  await fs.mkdir(targetPath, { recursive: true });
}

export async function removeIfExists(targetPath: string) {
  await fs.rm(targetPath, { recursive: true, force: true });
}

async function collectRelativeFiles(rootPath: string): Promise<string[]> {
  if (!(await pathExists(rootPath))) {
    return [];
  }

  const files: string[] = [];

  for await (const relativePath of new Glob("**/*").scan({
    cwd: rootPath,
    dot: true,
    onlyFiles: true,
  })) {
    files.push(relativePath);
  }

  return files;
}

async function formatGeneratedBindings(rootPath: string) {
  const files = (await collectRelativeFiles(rootPath))
    .filter(
      (filePath) =>
        filePath.endsWith(".js") ||
        filePath.endsWith(".ts") ||
        filePath.endsWith(".d.ts"),
    )
    .map((filePath) => path.join(rootPath, filePath));

  if (files.length === 0) {
    return;
  }

  await $`bunx dprint fmt --allow-no-files ${files}`.cwd(repoRoot);
}

async function disableTypecheckingForGeneratedBindings(rootPath: string) {
  const files = (await collectRelativeFiles(rootPath))
    .filter((filePath) => filePath.endsWith(".ts"))
    .map((filePath) => path.join(rootPath, filePath));

  for (const filePath of files) {
    const content = await Bun.file(filePath).text();
    if (content.startsWith("// @ts-nocheck\n")) {
      continue;
    }

    await Bun.write(filePath, `// @ts-nocheck\n${content}`);
  }
}

async function replaceFile(targetPath: string, sourcePath: string) {
  const tempTargetPath = `${targetPath}.tmp-${process.pid}`;
  await ensureDirectory(path.dirname(targetPath));
  await Bun.write(tempTargetPath, Bun.file(sourcePath));

  try {
    await fs.rename(tempTargetPath, targetPath);
  } catch {
    await fs.rm(targetPath, { force: true });
    await fs.rename(tempTargetPath, targetPath);
  }
}

async function syncGeneratedBindings(sourceDir: string, targetDir: string) {
  const nextFiles = new Set(await collectRelativeFiles(sourceDir));
  const currentFiles = new Set(await collectRelativeFiles(targetDir));

  for (const relativeFile of nextFiles) {
    await replaceFile(
      path.join(targetDir, relativeFile),
      path.join(sourceDir, relativeFile),
    );
  }

  for (const relativeFile of currentFiles) {
    if (!nextFiles.has(relativeFile)) {
      await fs.rm(path.join(targetDir, relativeFile), { force: true });
    }
  }
}

export async function writeTextIfChanged(targetPath: string, contents: string) {
  const existing = (await pathExists(targetPath))
    ? await Bun.file(targetPath).text()
    : null;

  if (existing === contents) {
    return;
  }

  await ensureDirectory(path.dirname(targetPath));
  await Bun.write(targetPath, contents);
}

export async function readJsonFile<T>(targetPath: string) {
  return (await Bun.file(targetPath).json()) as T;
}

export async function writeJsonFile(targetPath: string, value: unknown) {
  await writeTextIfChanged(targetPath, `${JSON.stringify(value, null, 2)}\n`);
}

export function getCurrentTarget(): { os: GoOS; arch: GoArch } {
  return {
    os:
      process.platform === "darwin"
        ? "darwin"
        : process.platform === "linux"
          ? "linux"
          : "windows",
    arch: process.arch === "arm64" ? "arm64" : "amd64",
  };
}

export function binaryNameForTarget(slug: string, targetOS: GoOS) {
  return targetOS === "windows" ? `${slug}.exe` : slug;
}

export function artifactPlatformName(targetOS: GoOS) {
  return targetOS === "darwin" ? "macos" : targetOS;
}

export function artifactBaseName(
  slug: string,
  targetOS: GoOS,
  targetArch: string,
  version: string,
) {
  return `${slug}-${artifactPlatformName(targetOS)}-${targetArch}-${version}`;
}

export function windowsSysoPath(targetArch: GoArch) {
  return path.join(repoRoot, `wails_windows_${targetArch}.syso`);
}

export async function ensureBuildAssetsPresent() {
  for (const requiredPath of [
    path.join(buildDarwinDir, "Info.plist"),
    path.join(buildDarwinDir, "Info.dev.plist"),
    path.join(buildWindowsDir, "info.json"),
    path.join(buildWindowsDir, "wails.exe.manifest"),
    path.join(linuxAppImageDir, "build.sh"),
  ]) {
    if (!(await pathExists(requiredPath))) {
      throw new Error(
        `Missing required build asset ${requiredPath}. Run \`bun run sync-app-config\` first.`,
      );
    }
  }
}

export async function ensureFrontendDependencies() {
  if (await pathExists(path.join(frontendDir, "node_modules"))) {
    return;
  }

  await $`bun install`.cwd(frontendDir);
}

export async function ensureAppIconExists() {
  await ensureDirectory(buildDir);
  if (!(await Bun.file(buildAppIconPath).exists())) {
    await $`wails3 generate icons -example`.cwd(buildDir);
  }
}

export async function generatePlatformIcons() {
  await ensureAppIconExists();
  await $`wails3 generate icons -input ${buildAppIconPath} -macfilename ${path.join(buildDarwinDir, "icons.icns")} -windowsfilename ${path.join(buildWindowsDir, "icon.ico")}`.cwd(
    repoRoot,
  );
}

export async function ensureEmbeddedDist(config: ProjectConfig) {
  await ensureDirectory(frontendDistDir);
  const placeholderPath = path.join(frontendDistDir, "index.html");

  if (!(await Bun.file(placeholderPath).exists())) {
    await Bun.write(
      placeholderPath,
      [
        "<!doctype html>",
        '<html lang="en">',
        "  <head>",
        '    <meta charset="utf-8" />',
        `    <title>${config.info.productName}</title>`,
        "  </head>",
        "  <body></body>",
        "</html>",
        "",
      ].join("\n"),
    );
  }
}

export async function generateBindings(
  mode: BuildMode,
  options: { clean?: boolean } = {},
) {
  const clean = options.clean ?? mode === "release";
  const tempBindingsDir = path.join(frontendDir, ".bindings-next");

  await removeIfExists(tempBindingsDir);

  if (mode === "release") {
    await $`wails3 generate bindings -ts -d ${tempBindingsDir} -clean=${String(clean)} -f "-tags production"`.cwd(
      repoRoot,
    );
  } else {
    await $`wails3 generate bindings -ts -d ${tempBindingsDir} -clean=${String(clean)}`.cwd(
      repoRoot,
    );
  }

  await formatGeneratedBindings(tempBindingsDir);
  await disableTypecheckingForGeneratedBindings(tempBindingsDir);
  await syncGeneratedBindings(tempBindingsDir, frontendBindingsDir);
  await removeIfExists(tempBindingsDir);
}

export async function buildFrontendBundle() {
  await ensureFrontendDependencies();
  await $`bun run build`.cwd(frontendDir);
}

export async function runGoBuild(
  config: ProjectConfig,
  target: { os: GoOS; arch: GoArch },
  mode: BuildMode,
  outputPath: string,
) {
  await ensureDirectory(path.dirname(outputPath));

  const env: Record<string, string> = {
    GOOS: target.os,
    GOARCH: target.arch,
    CGO_ENABLED: "1",
  };

  if (target.os === "darwin") {
    env.MACOSX_DEPLOYMENT_TARGET = config.macOSDeploymentTarget;
    env.CGO_CFLAGS = `-mmacosx-version-min=${config.macOSDeploymentTarget}`;
    env.CGO_LDFLAGS = `-mmacosx-version-min=${config.macOSDeploymentTarget}`;
  }

  const extLdFlags =
    target.os === "darwin"
      ? `-extldflags=-mmacosx-version-min=${config.macOSDeploymentTarget}`
      : "";

  if (mode === "dev") {
    const ldflags = extLdFlags ? `${extLdFlags}` : "";
    await $`go build -buildvcs=false -gcflags=${"all=-N -l"} -ldflags=${ldflags} -o ${outputPath} .`
      .cwd(repoRoot)
      .env({ ...process.env, ...env });
    return;
  }

  const ldflagsBase = target.os === "windows" ? "-w -s -H windowsgui" : "-w -s";
  const ldflags = [ldflagsBase, extLdFlags].filter(Boolean).join(" ");
  await $`go build -buildvcs=false -tags production -trimpath -ldflags=${ldflags} -o ${outputPath} .`
    .cwd(repoRoot)
    .env({ ...process.env, ...env });
}

export async function generateWindowsSyso(targetArch: GoArch) {
  await generatePlatformIcons();
  await $`wails3 generate syso -arch ${targetArch} -icon ${path.join(buildWindowsDir, "icon.ico")} -manifest ${path.join(buildWindowsDir, "wails.exe.manifest")} -info ${path.join(buildWindowsDir, "info.json")} -out ${windowsSysoPath(targetArch)}`.cwd(
    repoRoot,
  );
}

export async function cleanupWindowsSyso(targetArch: GoArch) {
  await removeIfExists(windowsSysoPath(targetArch));
}

export async function generateLinuxDesktopEntry(config: ProjectConfig) {
  const desktopFilePath = path.join(buildLinuxDir, `${config.slug}.desktop`);
  await $`wails3 generate .desktop -name ${config.info.productName} -comment ${config.info.description} -exec ${config.slug} -icon ${config.slug} -categories ${"Utility;"} -outputfile ${desktopFilePath}`.cwd(
    repoRoot,
  );
  return desktopFilePath;
}

export async function createMacOSAppBundle(
  config: ProjectConfig,
  binaryPath: string,
  appBundlePath: string,
  infoPlistPath: string,
) {
  const contentsPath = path.join(appBundlePath, "Contents");
  const macOSDir = path.join(contentsPath, "MacOS");
  const resourcesDir = path.join(contentsPath, "Resources");

  await removeIfExists(appBundlePath);
  await ensureDirectory(macOSDir);
  await ensureDirectory(resourcesDir);
  await Bun.write(path.join(macOSDir, config.slug), Bun.file(binaryPath));
  await Bun.write(
    path.join(contentsPath, "Info.plist"),
    Bun.file(infoPlistPath),
  );

  const iconPath = path.join(buildDarwinDir, "icons.icns");
  if (await Bun.file(iconPath).exists()) {
    await Bun.write(path.join(resourcesDir, "icons.icns"), Bun.file(iconPath));
  }

  const assetsCarPath = path.join(buildDarwinDir, "Assets.car");
  if (await Bun.file(assetsCarPath).exists()) {
    await Bun.write(
      path.join(resourcesDir, "Assets.car"),
      Bun.file(assetsCarPath),
    );
  }
}

export async function adHocSignMacOSApp(appBundlePath: string) {
  if (process.platform === "darwin") {
    await $`codesign --force --deep --sign - ${appBundlePath}`;
  }
}

export async function zipMacOSApp(
  appBundlePath: string,
  outputZipPath: string,
) {
  await ensureDirectory(path.dirname(outputZipPath));
  await removeIfExists(outputZipPath);
  await $`ditto -c -k --keepParent ${appBundlePath} ${outputZipPath}`;
}

export async function binaryOutputPath(
  config: ProjectConfig,
  target: { os: GoOS; arch: GoArch },
  directory = buildBinDir,
) {
  await ensureDirectory(directory);
  return path.join(directory, binaryNameForTarget(config.slug, target.os));
}

export async function writeChecksumFile(artifactPath: string) {
  const hash = createHash("sha256");
  hash.update(await fs.readFile(artifactPath));
  const fileName = path.basename(artifactPath);
  const checksumPath = `${artifactPath}.sha256`;
  await Bun.write(checksumPath, `${hash.digest("hex")}  ${fileName}\n`);
}
