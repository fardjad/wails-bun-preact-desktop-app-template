#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config_file="${repo_root}/build/config.yml"

usage() {
  cat <<'EOF'
Usage:
  scripts/sync-app-config.sh print slug
  scripts/sync-app-config.sh sync

Reads build/config.yml as the source of truth for the app name and related metadata.
EOF
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1" >&2
    exit 1
  fi
}

read_config_value() {
  local key="$1"
  local value

  value="$(awk -v wanted="${key}" '
    $1 == "info:" { in_info = 1; next }
    in_info && $0 ~ /^[^[:space:]]/ { in_info = 0 }
    in_info && $1 == wanted ":" {
      sub(/^[^:]+:[[:space:]]*/, "", $0)
      gsub(/^"/, "", $0)
      gsub(/"$/, "", $0)
      print
      exit
    }
  ' "${config_file}")"

  if [ -z "${value}" ]; then
    echo "Missing info.${key} in ${config_file}" >&2
    exit 1
  fi

  printf '%s\n' "${value}"
}

slugify() {
  printf '%s' "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-+/-/g'
}

escape_for_double_quotes() {
  printf '%s' "$1" | perl -pe 's/\\/\\\\/g; s/"/\\"/g'
}

product_name="$(read_config_value productName)"
product_identifier="$(read_config_value productIdentifier)"
description="$(read_config_value description)"
app_slug="$(slugify "${product_name}")"

if [ -z "${app_slug}" ]; then
  echo "Derived app slug is empty. Check info.productName in ${config_file}." >&2
  exit 1
fi

print_value() {
  case "${1:-}" in
    slug)
      printf '%s\n' "${app_slug}"
      ;;
    product-name)
      printf '%s\n' "${product_name}"
      ;;
    product-identifier)
      printf '%s\n' "${product_identifier}"
      ;;
    description)
      printf '%s\n' "${description}"
      ;;
    *)
      usage >&2
      exit 1
      ;;
  esac
}

sync_files() {
  local escaped_product_name
  local escaped_product_identifier
  local escaped_description
  local escaped_slug
  local wails3

  require_command perl
  require_command bun

  wails3="$(command -v wails3 2>/dev/null || command -v "${HOME}/go/bin/wails3" 2>/dev/null || true)"
  if [ -z "${wails3}" ]; then
    echo "Required command not found: wails3" >&2
    exit 1
  fi

  escaped_product_name="$(escape_for_double_quotes "${product_name}")"
  escaped_product_identifier="$(escape_for_double_quotes "${product_identifier}")"
  escaped_description="$(escape_for_double_quotes "${description}")"
  escaped_slug="$(escape_for_double_quotes "${app_slug}")"

  perl -0pi -e "s/^module\\s+\\S+$/module ${escaped_slug}/m" "${repo_root}/go.mod"

  cat >"${repo_root}/app_metadata.go" <<EOF
package main

const (
    appProductName       = "${escaped_product_name}"
    appProductIdentifier = "${escaped_product_identifier}"
    appDescription       = "${escaped_description}"
    appProgramName       = "${escaped_slug}"
)
EOF

  cat >"${repo_root}/frontend/src/lib/app-metadata.ts" <<EOF
export const appProductName = "${escaped_product_name}";
export const appProductIdentifier = "${escaped_product_identifier}";
export const appDescription = "${escaped_description}";
export const appProgramName = "${escaped_slug}";
EOF

  while IFS= read -r -d '' file; do
    perl -0pi -e 's{(/bindings/)[^/"'"'"']+(/)}{$1'"${escaped_slug}"'$2}g' "${file}"
  done < <(find "${repo_root}/frontend/src" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \) -print0)

  perl -0pi -e 's#"name":\\s*"[^\"]*"#"name": "'"${escaped_slug}"'-frontend"#' \
    "${repo_root}/frontend/package.json"

  perl -0pi -e 's{<title>.*</title>}{<title>'"${escaped_product_name}"'</title>}' \
    "${repo_root}/frontend/index.html"

  if [ -f "${repo_root}/README.md" ]; then
    perl -0pi -e 's{^# .*}{# '"${escaped_product_name}"'}m' "${repo_root}/README.md"
  fi

  if [ -f "${repo_root}/justfile" ]; then
    perl -0pi -e 's{^# .*}{# '"${escaped_product_name}"'}m' "${repo_root}/justfile"
  fi

  rm -rf "${repo_root}/frontend/bindings"

  (
    cd "${repo_root}/build"
    "${wails3}" update build-assets -name "${app_slug}" -binaryname "${app_slug}" -config config.yml -dir .
  )

  rm -rf "${repo_root}/build/ios"
  rm -rf "${repo_root}/build/linux/nfpm"
  rm -f "${repo_root}/build/linux/desktop"
  rm -rf "${repo_root}/build/windows/nsis"

  (
    cd "${repo_root}"
    "${wails3}" generate bindings -clean=true
    gofmt -w app_metadata.go
  )

  (
    cd "${repo_root}/frontend"
    bun install --lockfile-only
  )

  echo "Synchronized app metadata from build/config.yml"
  echo "  productName: ${product_name}"
  echo "  slug:        ${app_slug}"
  echo "  identifier:  ${product_identifier}"
}

case "${1:-}" in
  print)
    print_value "${2:-}"
    ;;
  sync)
    sync_files
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
