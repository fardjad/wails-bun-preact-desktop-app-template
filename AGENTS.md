# Agent Guidelines

This repo is a Wails desktop app with a Go backend and a Bun-powered frontend.

## Command Defaults

- Prefer the repo-level Bun scripts in the root `package.json` for common
  development, sync, style, test, and release flows.
- For frontend work and repo helper scripts, default to Bun instead of Node.js.
- Use `bun <file>` instead of `node <file>` or `ts-node <file>`.
- Use `bun run <script>` for repo and frontend package scripts.
- Use `bun install` in `frontend/` for frontend dependencies.
- Bun automatically loads `.env`, so do not add `dotenv` just to load local env
  files.

## Scope For Bun

- Keep generated TypeScript and JavaScript portable unless the repo already
  requires a Bun-only feature.
- Do not introduce Bun-specific runtime APIs for general app code unless there
  is a clear repo-specific need.
- Bun is the default tool for the frontend and repository scripts, but the
  backend remains standard Go.
- In `frontend/` and `scripts/`, prefer Bun-native APIs when they clearly
  replace Node-only plumbing.

## Bun Usage Patterns

- Prefer Bun Shell (`import { $ } from "bun"`) for simple script commands
  instead of `child_process`.
- Use `Bun.spawn()` only when a process needs streaming I/O, long-running
  lifecycle control, or signal handling.
- Prefer `await Bun.sleep(ms)` over promise-wrapped `setTimeout`.
- Prefer `Bun.file()` and `Bun.write()` for normal file reads and writes in
  Bun-run code.
- Use `node:fs/promises` for directory operations that Bun does not provide
  directly.
- Avoid sync file APIs in async flows unless a synchronous interface requires
  them.
- Do not add redundant existence checks before reading a file when a normal read
  with error handling is sufficient.
- Prefer `Bun.JSON5` or `Bun.JSONL` over adding separate packages or hand-rolled
  parsing when those formats are needed.
- Prefer `Bun.stringWidth()` and `Bun.wrapAnsi()` over custom terminal-width or
  ANSI-wrapping helpers when working on Bun-run terminal formatting code.

## TypeScript Import Style

- In Bun-run TypeScript, avoid inline or dynamic imports unless there is a real
  runtime requirement.
- For `node:fs`, `node:path`, and similar built-ins, prefer namespace imports
  such as `import * as fs from "node:fs/promises"` and
  `import * as path from "node:path"`.

## Testing

- Run Go tests with `bun run test:go` or `go test ./...` when working on backend
  code.
- Run frontend tests with `bun run test:frontend` from the repo root, or
  `bun test` from `frontend/`.
- When changing frontend behavior or fixing a bug, prefer reproducing it in a
  test before fixing it.
- Use Bun's test runner for frontend tests.

## Build Guidance

- For TypeScript-only frontend changes, do not run a full packaged build unless
  the task specifically needs it.
- Use `bun run dev` for normal development.
- Use `bun run build` for a native local build of the current machine.
- Use `bun run release <os> <arch>` when validating release packaging behavior.
- `bun run release` requires explicit target arguments and does not default to
  the current machine automatically.
- If you need bindings regenerated or metadata synced, run
  `bun run sync-app-config`.
- In dev-mode rebuilds, do not regenerate bindings by deleting
  `frontend/bindings` in place. This repo now generates bindings into a
  temporary directory and then swaps the finished files into place so the
  frontend watcher does not observe missing or partially-written bindings.

## Repo-Specific Notes

- Frontend code lives in `frontend/`.
- Generated Wails bindings and related generated files should be regenerated,
  not hand-edited, when a backend API changes.
- App metadata is driven by `build/config.yml`; after changing app naming or
  metadata, run `bun run sync-app-config`.
- The build and release specification lives at
  `docs/build-and-release-specification.md`.
- CI is intentionally a single native Linux validation job. Multi-platform
  native verification belongs in release jobs, not CI.
- The `Release` workflow should be chained from a successful `CI` run on `main`,
  and release jobs should build the same commit SHA that `CI` validated.
- Linux AppImage packaging should stage files in `build/linux/appimage/` and
  invoke the AppImage generator from that directory with relative filenames, not
  absolute staged paths.
- The macOS release flow should prefer `macos-latest` and can build both `amd64`
  and `arm64` macOS artifacts on that current arm64 runner before packaging the
  universal app there too.
- In GitHub Actions workflows, prefer action refs that track the action's
  default branch such as `@main` or `@master`, depending on the action repo.
- Husky is configured at the repo root and runs `bun run style-check` as a
  pre-commit hook.
