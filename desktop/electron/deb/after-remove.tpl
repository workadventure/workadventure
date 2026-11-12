# Added after electron-builder's own after-remove.tpl by build-scripts.mjs.

# The APT repository added by the after-install script goes on purge only: a plain remove keeps it,
# like the rest of a package's configuration.
if [ "$1" = purge ]; then
  rm -f /etc/apt/sources.list.d/workadventure-desktop.sources /usr/share/keyrings/workadventure-desktop.gpg
fi
