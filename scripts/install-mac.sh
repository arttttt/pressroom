#!/bin/bash
#
# Builds Pressroom and puts it in /Applications.
#
# There is no signing identity and no notarisation: this application is built
# on the machine it runs on and never travels. Two consequences are handled
# here rather than left to surprise someone.
#
# Apple Silicon refuses to launch a binary with no signature at all, so the
# bundle is signed ad hoc — a signature that proves nothing about who made it,
# which is exactly right for something that came from this checkout.
#
# And anything macOS thinks arrived from elsewhere is quarantined, which shows
# up as "Pressroom is damaged and can't be opened". The attribute is stripped
# from the copy that gets installed.

set -euo pipefail

readonly ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly BUNDLE_ID="com.arttttt.pressroom"
readonly INSTALLED="/Applications/Pressroom.app"

cd "$ROOT"

echo "==> Building"
pnpm run build:mac

BUILT="$(find "$ROOT/release" -maxdepth 2 -name "Pressroom.app" -type d | head -1)"
if [[ -z "$BUILT" ]]; then
	echo "No Pressroom.app under release/ — the build did not produce a bundle." >&2
	exit 1
fi
echo "==> Built $BUILT"

# Ad hoc, and only if the build left it unsigned.
if ! codesign --verify --quiet "$BUILT" 2>/dev/null; then
	echo "==> Signing ad hoc"
	codesign --force --deep --sign - "$BUILT"
fi

# Replace only a previous copy of this same application. Anything else called
# Pressroom in /Applications belongs to someone else and is left alone.
if [[ -e "$INSTALLED" ]]; then
	existing="$(defaults read "$INSTALLED/Contents/Info" CFBundleIdentifier 2>/dev/null || echo "")"
	if [[ "$existing" != "$BUNDLE_ID" ]]; then
		echo "$INSTALLED is not Pressroom (bundle id '$existing'). Leaving it alone." >&2
		exit 1
	fi
	echo "==> Replacing the installed copy"
	rm -rf "$INSTALLED"
fi

echo "==> Installing to $INSTALLED"
cp -R "$BUILT" "$INSTALLED"
xattr -dr com.apple.quarantine "$INSTALLED" 2>/dev/null || true

echo
echo "Pressroom is in /Applications. The disk image, if you want to keep one:"
find "$ROOT/release" -maxdepth 1 -name "*.dmg" -exec echo "  {}" \;
