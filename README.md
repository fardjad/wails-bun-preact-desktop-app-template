# Cross-platform Desktop App Template

Cross-platform desktop application built with
[Wails 3 alpha](https://v3alpha.wails.io), Go, [Preact](https://preactjs.com),
TypeScript, and Bun.

## Prerequisites

- [Go](https://go.dev/dl/)
- [Bun](https://bun.sh)
- [Wails 3 CLI](https://v3alpha.wails.io)

Install the Wails CLI version that matches `go.mod`:

```sh
WAILS_VERSION="$(go list -m -f '{{.Version}}' github.com/wailsapp/wails/v3)"
go install "github.com/wailsapp/wails/v3/cmd/wails3@${WAILS_VERSION}"
```

On Linux, native builds and tests also need GTK/WebKit development packages.

## Quick Start

Sync generated metadata and build assets:

```sh
bun run sync-app-config
```

Start development mode:

```sh
bun run dev
```

This uses `build/config.yml` as the Wails dev-mode config and runs:

- a debug-friendly native Go build
- the Bun frontend dev server
- the compiled desktop binary

During Go-driven dev rebuilds, bindings are regenerated into a temporary
directory and then swapped into `frontend/bindings/` so the frontend watcher
does not see half-written generated files.

## Commands

Repo-level commands live in the root `package.json` and are driven by Bun:

```sh
bun run dev
bun run build
bun run test
bun run style-check
bun run style-fix
bun run sync-app-config
```

What they do:

- `bun run build`: native local build for the current machine
- `bun run test`: frontend tests, then Go tests
- `bun run style-check`: non-mutating formatting and lint checks
- `bun run style-fix`: apply supported formatting fixes
- `bun run sync-app-config`: regenerate config-derived metadata and Wails build
  assets

Git commits also run `bun run style-check` through a Husky pre-commit hook.

## Rename The App

`build/config.yml` is the source of truth for product metadata.

After changing any values under `info`, run:

```sh
bun run sync-app-config
```

That sync flow updates:

- `go.mod`
- `app_metadata.go`
- `frontend/src/lib/app-metadata.ts`
- `frontend/package.json`
- `frontend/index.html`
- `frontend/src/lib/backend.ts`
- `build/` metadata assets
- `build/linux/*.desktop`
- `frontend/bindings/`

Generated outputs are committed so metadata changes stay reviewable in Git.

## Release Outputs

Release artifacts follow this naming pattern:

```text
<slug>-<os>-<arch>-<version>
```

Supported release artifacts:

- Windows: `.exe`
- Linux: `.AppImage`
- macOS: `.app.zip`
- macOS universal: `.app.zip`

Local release examples:

```sh
bun run release windows amd64
bun run release linux arm64
bun run release macos arm64
```

`bun run release` requires an explicit target and architecture. It does not
default to the current machine automatically.

Universal macOS packaging combines two native binaries:

```sh
bun run release macos universal \
  --amd64-binary build/release/binaries/<slug>-macos-amd64-<version>.bin \
  --arm64-binary build/release/binaries/<slug>-macos-arm64-<version>.bin
```

Artifacts and `.sha256` checksum files are written to `build/release/`.

## GitHub Actions

The repo includes:

- `CI`: style checks plus native Linux build/test validation
- `Release`: version-gated native release jobs that start from a successful `CI`
  run on `main` and build that same validated commit

Release jobs build each target on a native runner and publish the GitHub release
only after every required artifact succeeds.

The macOS release flow runs on `macos-latest`. That current arm64 runner builds
both the `amd64` and `arm64` macOS binaries, then packages the universal app
from those two binaries on the same runner.

## Project Structure

- `build/config.yml`: canonical product metadata and Wails dev-mode config
- `scripts/`: Bun-based helper scripts for sync, build, test, style, and release
- `build/`: generated Wails metadata assets plus Linux AppImage packaging files
- `frontend/`: Bun-powered frontend app
- `frontend/bindings/`: generated Wails bindings
