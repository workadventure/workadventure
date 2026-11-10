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
sudo apt install ./workadventure-desktop_<version>_amd64.deb
```

Or add the repository yourself, then install:

```bash
sudo curl -fsSLo /usr/share/keyrings/workadventure-desktop.gpg https://apt.workadventu.re/workadventure-desktop.gpg
printf 'Types: deb\nURIs: https://apt.workadventu.re/\nSuites: ./\nSigned-By: /usr/share/keyrings/workadventure-desktop.gpg\n' | sudo tee /etc/apt/sources.list.d/workadventure-desktop.sources
sudo apt update && sudo apt install workadventure-desktop
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

To test an update locally, point the app at a folder served over HTTP holding the `latest*.yml` files
and the binaries: `WA_DESKTOP_UPDATE_URL=http://localhost:8080/`.

### Moving the 1.x installs (bridge release)

The previous desktop app (1.x) was published in the WorkAdventure releases of this repository and updates
from the latest one. To move it to 2.0.0, once only:

1. Wait for `desktop-v2.0.0` to be published in `desktop-releases`.
2. Right after the next WorkAdventure release is published (it must be the "Latest" one), run the
   **Desktop bridge release** workflow with its tag. It attaches the 2.0.0 Windows and Linux binaries
   and their `latest.yml` / `latest-linux.yml` to it. Windows and AppImage installs then update to
   2.0.0 at their next hourly check, and follow `desktop-releases` from then on.
3. Mac users reinstall 2.0.0 by hand: macOS only installs an update signed like the running app.

Only installs that check while that release is the Latest one move: once a newer WorkAdventure release
is published, the others stay on 1.x until reinstalled (re-run the workflow on the new release to
widen the window). Nothing else publishes the desktop app in the WorkAdventure releases anymore.
