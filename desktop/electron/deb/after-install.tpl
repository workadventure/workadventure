# Added after electron-builder's own after-install.tpl by build-scripts.mjs.

# APT repository, so that the system updater (apt upgrade) brings new versions, the way Chrome and
# VS Code do it. Rewritten on every upgrade, so a new key or URL reaches each install with the next
# version. Skipped without apt, or in a build that ships no key (forks).
if [ -d /etc/apt/sources.list.d ] && [ -f '/opt/${sanitizedProductName}/resources/workadventure-desktop.gpg' ]; then
  install -m 644 '/opt/${sanitizedProductName}/resources/workadventure-desktop.gpg' /usr/share/keyrings/workadventure-desktop.gpg
  cat > /etc/apt/sources.list.d/workadventure-desktop.sources <<'SOURCES'
Types: deb
URIs: https://apt.workadventu.re/
Suites: ./
Signed-By: /usr/share/keyrings/workadventure-desktop.gpg
SOURCES
fi
