# Cross-platform Desktop App Template

Cross-platform desktop application built with [Wails 3 alpha](https://v3.wails.io), Go, [Preact](https://preactjs.com), TypeScript, and Bun.

## Prerequisites

- [Go](https://go.dev/dl/)
- [Bun](https://bun.sh)
- [just](https://github.com/casey/just)
- [Wails 3 CLI](https://v3.wails.io)

```sh
go install github.com/wailsapp/wails/v3/cmd/wails3@latest
```

Verify the local toolchain:

```sh
just doctor
```

## Quick Start

```sh
just install
just dev
```

`just dev` runs the Wails 3 dev workflow using [build/config.yml](/Users/far/Desktop/desktop-application/build/config.yml). The `justfile` is the source of truth for local commands, and the Wails Taskfile/config delegate back to `just`.

## Renaming

Edit [build/config.yml](/Users/far/Desktop/desktop-application/build/config.yml), then run:

```sh
./scripts/sync-app-config.sh sync
```

That script treats `build/config.yml` as the source of truth, derives the binary slug from `info.productName`, updates the runtime and frontend metadata, refreshes `go.mod`, regenerates `frontend/bindings/`, updates Wails build assets, and removes unsupported generated build targets that Wails recreates by default.

## Project Structure

- Repository root: Go application entrypoint, backend services, `justfile`, `Taskfile.yml`, and module metadata.
- [build/config.yml](/Users/far/Desktop/desktop-application/build/config.yml): Wails 3 project and dev-mode configuration.
- [Taskfile.yml](/Users/far/Desktop/desktop-application/Taskfile.yml): thin Wails adapter that delegates to `just` recipes.
- `frontend/`: Bun-managed frontend workspace.
- `frontend/src/`: Preact application source.
- `frontend/src/lib/backend.ts`: typed wrapper around generated Wails bindings.
- `frontend/bindings/`: generated Wails 3 bindings.
- `build/`: Wails taskfiles, Docker cross-build config, macOS bundle metadata, and Windows binary metadata.

## Commands

Run `just` with no arguments to list recipes.

| Command | Description |
|---|---|
| `just dev` | Start Wails 3 development mode |
| `just install` | Install frontend dependencies |
| `just generate` | Regenerate Wails 3 bindings |
| `just frontend-build` | Build the frontend bundle after installing deps and regenerating bindings |
| `just setup-docker` | Build the Docker image used for Linux cross-compilation |
| `just typecheck` | Run frontend TypeScript checks |
| `just doctor` | Show installed Go/Bun/Wails/just versions |
| `just test` | Run Go and frontend tests |
| `just test-go` | Run Go tests |
| `just test-go-race` | Run Go tests with the race detector |
| `just test-frontend` | Run frontend tests |
| `just test-frontend-watch` | Run frontend tests in watch mode |
| `just build` | Build the app for the current host platform |
| `just build-darwin-amd64` | Build the macOS amd64 binary |
| `just build-darwin-arm64` | Build the macOS arm64 binary |
| `just build-darwin-universal` | Build the universal macOS binary |
| `just build-linux-amd64` | Build the Linux amd64 binary |
| `just build-linux-arm64` | Build the Linux arm64 binary |
| `just build-windows-amd64` | Build the Windows amd64 `.exe` |
| `just build-windows-arm64` | Build the Windows arm64 `.exe` |
| `just build-all` | Build all six supported OS/architecture outputs |
| `just package` | Package the host macOS `.app` bundle |
| `just package-darwin-amd64` | Package the macOS amd64 `.app` bundle |
| `just package-darwin-arm64` | Package the macOS arm64 `.app` bundle |
| `just package-darwin-universal` | Package the universal macOS `.app` bundle |
| `just clean` | Remove generated local build artifacts |

Supported outputs in this repo are intentionally limited to:

- Windows: `.exe` only
- Linux: binary only
- macOS: binary, universal binary, and `.app`

Each platform supports `amd64` and `arm64`.

## Wails 3 Notes

The app now uses Wails 3 services instead of Wails 2 `Bind` plus runtime context hooks.

- Backend service registration happens in [main.go](/Users/far/Desktop/desktop-application/main.go#L16).
- The service methods exposed to the frontend live in [app.go](/Users/far/Desktop/desktop-application/app.go#L10).
- Generated bindings are emitted to `frontend/bindings/`.
- Frontend code imports the typed wrapper in [frontend/src/lib/backend.ts](/Users/far/Desktop/desktop-application/frontend/src/lib/backend.ts#L1) instead of importing generated JS files directly.

Example:

```ts
import { Greet, GetSystemInfo } from "../lib/backend";

const greeting = await Greet("world");
const info = await GetSystemInfo();
```

## Development Workflow

Wails 3 development is configured in [build/config.yml](/Users/far/Desktop/desktop-application/build/config.yml#L12), and each step delegates to `just`:

1. `just generate`
2. `just frontend-dev`
3. `just run-app`

The frontend remains Bun-only for package management, building, and tests.

Linux cross-compilation uses Docker via [build/docker/Dockerfile.cross](/Users/far/Desktop/desktop-application/build/docker/Dockerfile.cross). The Linux build recipes will automatically build the `wails-cross` image on first use if it is missing.

## Testing

Go tests live in [app_test.go](/Users/far/Desktop/desktop-application/app_test.go). Frontend tests live under `frontend/src/**/*.test.tsx` and run with `bun test`.

Validated migration commands:

```sh
go build ./...
cd frontend && bun run typecheck
cd frontend && bun test
cd frontend && bun run build
wails3 build
```

## Adding a New Backend Method

1. Add an exported method to [app.go](/Users/far/Desktop/desktop-application/app.go).
2. Run `just generate` or `just dev`.
3. Re-export it from [frontend/src/lib/backend.ts](/Users/far/Desktop/desktop-application/frontend/src/lib/backend.ts).
4. Import it from the wrapper in your component.

Example:

```go
func (a *App) MyMethod(arg string) (string, error) {
	return "result", nil
}
```

```ts
import { MyMethod } from "../lib/backend";

const result = await MyMethod("input");
```
