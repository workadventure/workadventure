# Desktop app

The desktop app is an Electron shell in `./electron/`. It does not bundle a frontend: each tab is a
`WebContentsView` loading a remote WorkAdventure world (Play/Admin), restricted to an allow-list of
origins. The shell adds what a browser tab cannot do: login in the system browser through a loopback
callback, `workadventure://join` deep links, native Picture-in-Picture / mini window, the
presenter meeting bar, global mute/camera shortcuts and a tray.

## Development

```bash
cd electron
npm install
# start the app in watch mode (WA_DESKTOP_PORTAL_URL defaults to the local admin in development)
NODE_ENV=development npm run dev

# checks
npm run typecheck && npm run lint && npm test && npm run pretty-check

# or create an executable
npm run bundle
```

## Install on Debian / Ubuntu

Installing the `.deb` from a GitHub release also adds the WorkAdventure APT repository, so the app
then updates with the rest of the system (`sudo apt upgrade` or the Software Updater):

```bash
sudo apt install ./WorkAdventure-amd64.deb   # or -arm64.deb on an arm64 machine
```

Or add the repository yourself, then install:

```bash
sudo curl -fsSLo /usr/share/keyrings/workadventure.gpg https://apt.workadventu.re/workadventure.gpg
printf 'Types: deb\nURIs: https://apt.workadventu.re/\nSuites: ./\nSigned-By: /usr/share/keyrings/workadventure.gpg\n' | sudo tee /etc/apt/sources.list.d/workadventure.sources
sudo apt update && sudo apt install workadventure
```

On Ubuntu 24.04 and later, prefer the `.deb` to the AppImage: AppArmor stops the AppImage from
starting the Chromium sandbox, so it runs with `--no-sandbox`.

How it is published: once a desktop release is published (see [Releases](#releases)), the
`apt_repository` job of `.github/workflows/build-and-release-desktop.yml` adds its `.deb` to the
`apt-repo` branch of [workadventure/desktop-releases](https://github.com/workadventure/desktop-releases)
(only the index, signed with the `APT_SIGNING_KEY` secret).
apt.workadventu.re serves that branch and redirects `releases/download/…` to the release of
`desktop-releases` that holds the `.deb`. The `.deb`'s scripts and the repository's public key are in
`electron/deb/`.

## API for the front

The world renderer gets `window.WAD`, typed in `libs/desktop-api` (`@workadventure/desktop-api`), which both the
preload and play import:

```ts
if (window.WAD?.desktop) {
    window.WAD.notify("Hello from the front");
}
```

## Releases

The desktop app has its own version, independent of the WorkAdventure server, and is published in
[workadventure/desktop-releases](https://github.com/workadventure/desktop-releases), where the app's
auto-updater looks for updates.

1. On every push to `master`, release-please (`.github/workflows/release-please-desktop.yml`) keeps a
   release PR open with the next version, computed from the [conventional commits](https://www.conventionalcommits.org/)
   touching `desktop/electron/` (`feat:` → minor, `fix:` → patch, `!` → major), and the matching
   `electron/CHANGELOG.md`.
2. Merging that PR bumps `electron/package.json`. The same workflow then tags the commit `desktop-v<version>`.
3. The tag runs `.github/workflows/build-and-release-desktop.yml`: the three OS are built and uploaded to a
   draft release of `desktop-releases`, published (with the CHANGELOG section as notes) once all three
   are there.

The app is in beta: with `"prerelease": true` in `release-please-config.json`, every release PR bumps
the beta number (`2.0.0-beta.1` → `2.0.0-beta.2`). Set it to `false` and the next release PR is `2.0.0`.

To test an update locally, point the app at a folder served over HTTP holding the `latest*.yml` files
and the binaries: `WA_DESKTOP_UPDATE_URL=http://localhost:8080/`.
