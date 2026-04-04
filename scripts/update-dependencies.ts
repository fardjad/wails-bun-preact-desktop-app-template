import { $ } from "bun";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseArgs } from "node:util";
import { readJsonFile, repoRoot } from "./common";

const minimumReleaseAgeSeconds = 7 * 24 * 60 * 60;
const { values } = parseArgs({
  args: Bun.argv,
  options: {
    check: {
      type: "boolean",
    },
  },
  allowPositionals: true,
  strict: true,
});

const mode = values.check ? "check" : "apply";

if (mode !== "apply" && mode !== "check") {
  throw new Error(
    "Usage: bun run scripts/update-dependencies.ts [apply|check]",
  );
}

async function writeLatestBunVersion(rootDir: string) {
  const latestBunVersion = (
    await $`bunx npm view bun version`.cwd(rootDir).text()
  ).trim();

  await Bun.write(path.join(rootDir, ".bun-version"), `${latestBunVersion}\n`);
}

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type GoRelease = {
  version: string;
  stable: boolean;
};

type GoModuleVersion = {
  path: string;
  version: string;
};

async function readVersions(targetPath: string) {
  return await readJsonFile<PackageJson>(targetPath);
}

function parseGoVersion(goModContents: string) {
  const match = goModContents.match(/^go\s+(\d+\.\d+(?:\.\d+)?)$/m);
  if (!match) {
    throw new Error("Could not determine the Go version from go.mod.");
  }

  return match[1];
}

function formatVersion(version?: string) {
  return version && version.trim() ? version : "(none)";
}

function collectPackageChanges(before: PackageJson, after: PackageJson) {
  const changes: string[] = [];

  for (const section of ["dependencies", "devDependencies"] as const) {
    const beforeDeps = before[section] ?? {};
    const afterDeps = after[section] ?? {};

    for (const [name, nextVersion] of Object.entries(afterDeps)) {
      const previousVersion = beforeDeps[name];
      if (previousVersion && previousVersion !== nextVersion) {
        changes.push(`- ${name}: ${previousVersion} -> ${nextVersion}`);
      }
    }
  }

  return changes;
}

function getGoModulePath(goModContents: string) {
  const match = goModContents.match(/^module\s+(\S+)$/m);
  if (!match) {
    throw new Error("Could not determine the Go module path from go.mod.");
  }

  return match[1];
}

async function writeLatestGoVersion(rootDir: string) {
  const response = await fetch("https://go.dev/dl/?mode=json");
  if (!response.ok) {
    throw new Error(`Failed to fetch Go release data: ${response.status}`);
  }

  const releases = (await response.json()) as GoRelease[];
  const latestStableVersion = releases.find(
    (release) => release.stable,
  )?.version;
  if (!latestStableVersion) {
    throw new Error("Could not determine the latest stable Go release.");
  }

  const normalizedVersion = latestStableVersion.replace(/^go/, "");
  const goModPath = path.join(rootDir, "go.mod");
  const goMod = await Bun.file(goModPath).text();
  const nextGoMod = goMod.replace(
    /^go\s+\d+\.\d+(?:\.\d+)?$/m,
    `go ${normalizedVersion}`,
  );

  if (nextGoMod === goMod) {
    return;
  }

  await Bun.write(goModPath, nextGoMod);
}

async function readGoModuleVersions(rootDir: string) {
  const goMod = await Bun.file(path.join(rootDir, "go.mod")).text();
  const modulePath = getGoModulePath(goMod);
  const output = (
    await $`go list -m -f '{{.Path}}\t{{.Version}}' all`.cwd(rootDir).text()
  ).trim();

  const versions = new Map<string, string>();

  for (const line of output.split("\n")) {
    if (!line) {
      continue;
    }

    const [pathName, version = ""] = line.split("\t");
    if (!pathName || pathName === modulePath) {
      continue;
    }

    versions.set(pathName, version);
  }

  return versions;
}

function collectGoModuleChanges(
  before: Map<string, string>,
  after: Map<string, string>,
) {
  const changes: string[] = [];
  const moduleNames = new Set([...before.keys(), ...after.keys()]);

  for (const moduleName of [...moduleNames].sort()) {
    const previousVersion = before.get(moduleName);
    const nextVersion = after.get(moduleName);

    if (previousVersion !== nextVersion) {
      changes.push(
        `- ${moduleName}: ${formatVersion(previousVersion)} -> ${formatVersion(nextVersion)}`,
      );
    }
  }

  return changes;
}

async function runUpdate(rootDir: string) {
  const frontendDir = path.join(rootDir, "frontend");
  const beforeGoVersion = parseGoVersion(
    await Bun.file(path.join(rootDir, "go.mod")).text(),
  );
  const beforeBunVersion = (
    await Bun.file(path.join(rootDir, ".bun-version")).text()
  ).trim();
  const beforeRootPackage = await readVersions(
    path.join(rootDir, "package.json"),
  );
  const beforeFrontendPackage = await readVersions(
    path.join(frontendDir, "package.json"),
  );
  const beforeGoModules = await readGoModuleVersions(rootDir);

  await writeLatestGoVersion(rootDir);
  await writeLatestBunVersion(rootDir);
  await $`bun update --latest --minimum-release-age=${minimumReleaseAgeSeconds}`.cwd(
    rootDir,
  );
  await $`bun install`.cwd(rootDir);
  await $`bun update --latest --minimum-release-age=${minimumReleaseAgeSeconds}`.cwd(
    frontendDir,
  );
  await $`bun install`.cwd(frontendDir);
  await $`go get -u all`.cwd(rootDir);
  await $`go mod tidy`.cwd(rootDir);
  await $`bun run style-fix`.cwd(rootDir);

  const afterBunVersion = (
    await Bun.file(path.join(rootDir, ".bun-version")).text()
  ).trim();
  const afterGoVersion = parseGoVersion(
    await Bun.file(path.join(rootDir, "go.mod")).text(),
  );
  const afterRootPackage = await readVersions(
    path.join(rootDir, "package.json"),
  );
  const afterFrontendPackage = await readVersions(
    path.join(frontendDir, "package.json"),
  );
  const afterGoModules = await readGoModuleVersions(rootDir);

  const summaryLines = [
    beforeGoVersion !== afterGoVersion
      ? `- Go: ${beforeGoVersion} -> ${afterGoVersion}`
      : "",
    beforeBunVersion !== afterBunVersion
      ? `- Bun: ${beforeBunVersion} -> ${afterBunVersion}`
      : "",
    ...collectPackageChanges(beforeRootPackage, afterRootPackage).map(
      (line) => `- root package.json ${line.slice(2)}`,
    ),
    ...collectPackageChanges(beforeFrontendPackage, afterFrontendPackage).map(
      (line) => `- frontend/package.json ${line.slice(2)}`,
    ),
    ...collectGoModuleChanges(beforeGoModules, afterGoModules),
  ].filter(Boolean);

  console.log("=== AUTOMATIC_MAINTENANCE_SUMMARY ===");
  if (summaryLines.length > 0) {
    console.log(summaryLines.join("\n"));
  }
}

async function createWorktree(): Promise<{
  worktreeDir: string;
  tempDir: string;
}> {
  const tempDir = (await $`mktemp -d`.cwd(repoRoot).text()).trim();
  const worktreeDir = path.join(tempDir, "repo");
  await $`git worktree add --detach ${worktreeDir} HEAD`.cwd(repoRoot);
  return { worktreeDir, tempDir };
}

async function removeWorktree(worktreeDir: string, tempDir: string) {
  try {
    await $`git worktree remove --force ${worktreeDir}`.cwd(repoRoot);
  } catch {
    // Ignore cleanup failures and remove the temp directory directly.
  }

  await fs.rm(tempDir, { force: true, recursive: true });
}

if (mode === "check") {
  const { worktreeDir, tempDir } = await createWorktree();

  try {
    await runUpdate(worktreeDir);

    const status = (
      await $`git status --porcelain`.cwd(worktreeDir).text()
    ).trim();
    if (status) {
      console.log(status);
      process.exit(1);
    }
  } finally {
    await removeWorktree(worktreeDir, tempDir);
  }
} else {
  await runUpdate(repoRoot);
}
