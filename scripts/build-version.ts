import { $ } from "bun";
import { parseArgs } from "node:util";
import {
  buildConfigPath,
  loadProjectConfig,
  repoRoot,
  writeTextIfChanged,
} from "./common";

const { positionals, values } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    help: {
      type: "boolean",
      short: "h",
    },
  },
  strict: true,
});

const nextVersion = positionals[0];
const validBumpTypes = new Set(["patch", "minor", "major"]);
const usage = "Usage: bun run build-version [patch|minor|major|x.y.z]";

function incrementSemver(version: string, bumpType: string) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid semantic version: ${version}`);
  }

  const [, major, minor, patch] = match;

  switch (bumpType) {
    case "patch":
      return `${major}.${minor}.${Number(patch) + 1}`;
    case "minor":
      return `${major}.${Number(minor) + 1}.0`;
    case "major":
      return `${Number(major) + 1}.0.0`;
    default:
      throw new Error(`Unsupported bump type: ${bumpType}`);
  }
}

async function updateBuildVersion(version: string) {
  const buildConfig = await Bun.file(buildConfigPath).text();
  const versionMatch = buildConfig.match(
    /^(\s*version:\s*")(\d+)\.(\d+)\.(\d+)("\s*)$/m,
  );

  if (!versionMatch) {
    throw new Error(`Could not find a semantic version in ${buildConfigPath}.`);
  }

  const [, prefix, , , , suffix] = versionMatch;

  await writeTextIfChanged(
    buildConfigPath,
    buildConfig.replace(versionMatch[0], `${prefix}${version}${suffix}`),
  );
}

async function main() {
  if (positionals.length > 1) {
    throw new Error(usage);
  }

  if (values.help) {
    console.log(usage);
    return;
  }

  if (!nextVersion) {
    const config = await loadProjectConfig();
    console.log(config.info.version);
    return;
  }

  const beforeConfig = await loadProjectConfig();
  const version = validBumpTypes.has(nextVersion)
    ? incrementSemver(beforeConfig.info.version, nextVersion)
    : nextVersion;

  await updateBuildVersion(version);
  await $`bun run sync-app-config`.cwd(repoRoot);
}

await main();
