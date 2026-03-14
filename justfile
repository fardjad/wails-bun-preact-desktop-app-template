# Desktop Application
# Thin convenience wrappers around the Wails 3 CLI.

wails3 := `command -v wails3 2>/dev/null || command -v "$HOME/go/bin/wails3" 2>/dev/null`
macos_min_version := `awk -F= '/^MACOS_MIN_VERSION=/{print $2}' build/darwin/version.env`

default:
    @just --list

[private]
macos-build-env:
    #!/usr/bin/env bash
    set -euo pipefail

    printf "export MACOSX_DEPLOYMENT_TARGET=%s\n" "{{macos_min_version}}"
    printf "export CGO_CFLAGS='-mmacosx-version-min=%s'\n" "{{macos_min_version}}"
    printf "export CGO_LDFLAGS='-mmacosx-version-min=%s'\n" "{{macos_min_version}}"

[private]
dev-generate-bindings:
    just wails generate bindings -clean=true

[private]
dev-frontend:
    just wails task common:dev:frontend

[private]
dev-run-app:
    #!/usr/bin/env bash
    set -euo pipefail

    mkdir -p frontend/dist
    if [ ! -f frontend/dist/index.html ]; then
        printf '<!doctype html><title>Wails Dev Placeholder</title>\n' > frontend/dist/index.html
    fi

    eval "$(just macos-build-env)"
    exec go run .

test: test-go test-frontend

test-go:
    #!/usr/bin/env bash
    set -euo pipefail

    if [ ! -f frontend/dist/index.html ]; then
        just wails task build:frontend
    fi

    if [ "$(uname -s)" = "Darwin" ]; then
        eval "$(just macos-build-env)"
    fi

    go test -v ./...

test-go-race:
    #!/usr/bin/env bash
    set -euo pipefail

    if [ ! -f frontend/dist/index.html ]; then
        just wails task build:frontend
    fi

    if [ "$(uname -s)" = "Darwin" ]; then
        eval "$(just macos-build-env)"
    fi

    go test -race -v ./...

test-frontend:
    cd frontend && bun test

test-frontend-watch:
    cd frontend && bun test --watch

clean:
    #!/usr/bin/env bash
    set -euo pipefail

    rm -rf bin
    rm -rf build/bin
    rm -rf frontend/dist
    rm -rf frontend/bindings

build:
    just wails build

build-all:
    just wails task build:all

dev:
    just wails task dev

package:
    just wails package

wails +args='':
    {{wails3}} {{args}}
