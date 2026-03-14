# Cross-platform Desktop App Template

Cross-platform desktop application built with [Wails 3 alpha](https://v3.wails.io), Go, [Preact](https://preactjs.com), TypeScript, and Bun.

## Prerequisites

- [Go](https://go.dev/dl/)
- [Bun](https://bun.sh)
- [just](https://github.com/casey/just)
- [Wails 3 CLI](https://v3.wails.io)
- [Docker](https://www.docker.com/) for Linux cross-builds

Install Wails 3:

```sh
go install github.com/wailsapp/wails/v3/cmd/wails3@latest
```

## Quick Start

```sh
just dev
```

That starts Wails dev mode using [build/config.yml](/Users/far/Desktop/desktop-application/build/config.yml). Frontend dependencies are installed automatically when needed.

## Rename The App

[build/config.yml](/Users/far/Desktop/desktop-application/build/config.yml) is the source of truth for the app name and metadata.

After changing it, run:

```sh
just sync-app-config
```

That delegates to [scripts/sync-app-config.sh](/Users/far/Desktop/desktop-application/scripts/sync-app-config.sh), which:

- derives the binary slug from `info.productName`
- updates [go.mod](/Users/far/Desktop/desktop-application/go.mod)
- regenerates [app_metadata.go](/Users/far/Desktop/desktop-application/app_metadata.go)
- regenerates [frontend/src/lib/app-metadata.ts](/Users/far/Desktop/desktop-application/frontend/src/lib/app-metadata.ts)
- rewrites frontend binding imports such as [frontend/src/lib/backend.ts](/Users/far/Desktop/desktop-application/frontend/src/lib/backend.ts)
- regenerates `frontend/bindings/`
- refreshes Wails build assets under `build/`
- removes unsupported generated build targets that Wails recreates by default

## Commands

Run `just` with no arguments to list the public recipes.

Examples:

```sh
just wails version
just wails task --list-all
just wails task build:darwin:universal
just wails task package:darwin:universal
```

## Supported Outputs

This repo intentionally supports a small output surface:

- Windows: `.exe` only
- Linux: binary only
- macOS: binary and `.app`
- Architectures: `amd64` and `arm64`
- macOS universal binary and universal `.app` are available through Wails tasks

`just build-all` builds:

- `darwin/amd64`
- `darwin/arm64`
- `linux/amd64`
- `linux/arm64`
- `windows/amd64`
- `windows/arm64`

For universal macOS outputs, use:

```sh
just wails task build:darwin:universal
just wails task package:darwin:universal
```

## Project Structure

- [build/config.yml](/Users/far/Desktop/desktop-application/build/config.yml): Wails project metadata and dev-mode configuration
- [Taskfile.yml](/Users/far/Desktop/desktop-application/Taskfile.yml): top-level Wails task entrypoint
- [justfile](/Users/far/Desktop/desktop-application/justfile): thin local command surface
- [build/docker/Dockerfile.cross](/Users/far/Desktop/desktop-application/build/docker/Dockerfile.cross): Docker image used for cross-platform builds
- [build/darwin/version.env](/Users/far/Desktop/desktop-application/build/darwin/version.env): macOS deployment target and SDK version source of truth
- [app.go](/Users/far/Desktop/desktop-application/app.go): backend service methods exposed to the frontend
- [main.go](/Users/far/Desktop/desktop-application/main.go): Wails app bootstrap and window setup
- [frontend/src/lib/backend.ts](/Users/far/Desktop/desktop-application/frontend/src/lib/backend.ts): typed wrapper around generated Wails bindings
- [frontend/src/lib/app-metadata.ts](/Users/far/Desktop/desktop-application/frontend/src/lib/app-metadata.ts): generated frontend app metadata
- `frontend/bindings/`: generated Wails bindings

## Development Notes

Wails dev mode is configured in [build/config.yml](/Users/far/Desktop/desktop-application/build/config.yml). It calls private helper recipes in [justfile](/Users/far/Desktop/desktop-application/justfile) to:

- regenerate bindings
- start the Bun frontend dev server
- run the Go app

Linux cross-builds use Docker. If the cross-build images do not exist yet, run:

```sh
just wails task setup:docker
```

## Testing

Go tests live in [app_test.go](/Users/far/Desktop/desktop-application/app_test.go). Frontend tests live under `frontend/src/**/*.test.tsx`.

Common test commands:

```sh
just test
just test-go
just test-frontend
```

## Adding A Backend Method

1. Add an exported method to [app.go](/Users/far/Desktop/desktop-application/app.go).
2. Run `just dev` or `just wails generate bindings -clean=true`.
3. Re-export it from [frontend/src/lib/backend.ts](/Users/far/Desktop/desktop-application/frontend/src/lib/backend.ts).
4. Import it from the wrapper in your frontend code.
