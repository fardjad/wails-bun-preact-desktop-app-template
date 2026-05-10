#!/usr/bin/env bash
set -euo pipefail

# Go 1.26 rejects `go install module@version` when the target module contains
# replace directives. Install the pinned Wails CLI from a checked-out tag
# instead so repo automation still follows the Wails version declared in go.mod.
# Use a sparse checkout of the directories the v3 module actually needs to
# avoid Windows checkout issues in the full upstream repository.

WAILS_VERSION="${1:-$(go list -m -f '{{.Version}}' github.com/wailsapp/wails/v3)}"
TEMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "${TEMP_DIR}"
}

trap cleanup EXIT

git init "${TEMP_DIR}"

(
  cd "${TEMP_DIR}"
  git remote add origin https://github.com/wailsapp/wails
  git config core.longpaths true || true
  git sparse-checkout init --cone
  git sparse-checkout set v3 webview2
  git fetch --depth=1 origin "refs/tags/${WAILS_VERSION}"
  git checkout FETCH_HEAD
)

if [[ "$(uname -s)" == "Linux" && -z "${PKG_CONFIG_PATH:-}" ]]; then
  export PKG_CONFIG_PATH="/usr/lib64/pkgconfig:/usr/lib/pkgconfig:/usr/share/pkgconfig"
fi

(
  cd "${TEMP_DIR}/v3"
  go install ./cmd/wails3
)

if [[ -n "${GITHUB_PATH:-}" ]]; then
  echo "$(go env GOPATH)/bin" >>"${GITHUB_PATH}"
fi
