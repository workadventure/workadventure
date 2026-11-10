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

## API for the front

The world renderer gets `window.WAD` (see `electron/src/preload-app/types.ts`, mirrored in
`play/src/front/Interfaces/DesktopAppInterfaces.ts`):

```ts
if (window.WAD?.desktop) {
    window.WAD.notify({ title: "WorkAdventure", body: "Hello from the front" });
}
```
