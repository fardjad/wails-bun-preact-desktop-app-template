#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "Usage: bash scripts/package-linux-appimage.sh <slug> <binary-path> <desktop-path> <icon-path> <output-path>" >&2
  exit 1
fi

slug="$1"
binary_path="$2"
desktop_path="$3"
icon_path="$4"
output_path="$5"

export DEBIAN_FRONTEND=noninteractive

apt-get update >/dev/null
apt-get install -y \
  ca-certificates \
  curl \
  file \
  imagemagick >/dev/null

case "$(uname -m)" in
x86_64)
  appimage_arch="x86_64"
  ;;
aarch64 | arm64)
  appimage_arch="aarch64"
  ;;
*)
  echo "Unsupported Linux AppImage architecture: $(uname -m)" >&2
  exit 1
  ;;
esac

work_dir="$(mktemp -d /tmp/wails-appimage-XXXXXX)"
app_dir="$work_dir/$slug.AppDir"
app_image_tool="$work_dir/appimagetool.AppImage"

cleanup() {
  rm -rf "$work_dir"
}
trap cleanup EXIT

mkdir -p \
  "$app_dir/usr/bin" \
  "$app_dir/usr/share/applications" \
  "$app_dir/usr/share/icons/hicolor/512x512/apps"

install -m 0755 "$binary_path" "$app_dir/usr/bin/$slug"
install -m 0644 "$desktop_path" "$app_dir/usr/share/applications/$slug.desktop"
install -m 0644 "$desktop_path" "$app_dir/$slug.desktop"

convert "$icon_path" -resize 512x512 "$app_dir/usr/share/icons/hicolor/512x512/apps/$slug.png"
install -m 0644 \
  "$app_dir/usr/share/icons/hicolor/512x512/apps/$slug.png" \
  "$app_dir/$slug.png"
ln -sf "$slug.png" "$app_dir/.DirIcon"

cat >"$app_dir/AppRun" <<EOF
#!/usr/bin/env bash
set -euo pipefail
APPDIR="\${APPDIR:-\$(dirname "\$(readlink -f "\$0")")}"
exec "\$APPDIR/usr/bin/$slug" "\$@"
EOF
chmod 0755 "$app_dir/AppRun"

curl -fsSLo "$app_image_tool" \
  "https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-$appimage_arch.AppImage"
chmod 0755 "$app_image_tool"

mkdir -p "$(dirname "$output_path")"
ARCH="$appimage_arch" "$app_image_tool" --appimage-extract-and-run "$app_dir" "$output_path" >/dev/null
chmod 0755 "$output_path"
