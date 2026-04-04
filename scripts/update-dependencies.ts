import { $ } from "bun";
import { frontendDir, repoRoot } from "./common";

await $`bun update --latest`.cwd(repoRoot);
await $`bun install`.cwd(repoRoot);
await $`bun update --latest`.cwd(frontendDir);
await $`bun install`.cwd(frontendDir);
await $`go get -u all`.cwd(repoRoot);
await $`go mod tidy`.cwd(repoRoot);
