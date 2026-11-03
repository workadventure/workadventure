# Desktop app

The desktop app is an Electron shell in `./electron/`. It does not bundle a frontend: each tab is a
`WebContentsView` loading a remote WorkAdventure world (Play/Admin), restricted to an allow-list of
origins. The shell adds what a browser tab cannot do: login in the system browser through a loopback
callback, `workadventure://join` deep links, native Picture-in-Picture / companion panel, the
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

How it is published: on each release, the `apt_repository` job of
`.github/workflows/build-and-release-desktop.yml` adds the `.deb` to the `apt-repo` branch (only the
index, signed with the `APT_SIGNING_KEY` secret). apt.workadventu.re serves that branch and redirects
`releases/download/…` to the GitHub release that holds the `.deb`. The `.deb`'s scripts and the
repository's public key are in `electron/deb/`.

## API for the front

The world renderer gets `window.WAD` (see `electron/src/preload-app/types.ts`, mirrored in
`play/src/front/Interfaces/DesktopAppInterfaces.ts`):

```ts
if (window.WAD?.desktop) {
    window.WAD.notify({ title: "WorkAdventure", body: "Hello from the front" });
}
```
