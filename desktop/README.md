# Desktop app

The desktop component is an electron app inside `./electron/`. It uses a hybrid setup based of two main components:

- A `local-app` bundled into the electron app with two main parts:
  - A sidebar to show the server list, with the currently selected server
  - A main page which is used to manage servers and to show other "local" pages like the desktop-app settings
- A BrowserView (often called `appView` or `app`) showing the actual frontend of an external WorkAdventure deployment.
  If a server is selected the BrowserView / `appView` is overlaying the whole main part right to the sidebar.

## Development

```bash
# start local-app in watch mode
cd local-app && yarn dev

# start electron app in watch mode
cd electron && LOCAL_APP_URL=http://localhost:3000 yarn dev

# or create an executable by running:
cd electron && yarn bundle
```

## API for front

TODO:

```ts
if (window?.WorkAdventureDesktopApi?.desktop) {
  alert("Yeah you are using the desktop app ;)");
}

let muted = false;

window?.WorkAdventureDesktopApi?.onMutedKeyPress((event) => {
  if (muted) {
    document.getElementById("info-box").innerHTML =
      "Ready to speak! Press ctrl-alt-m to mute.";
  } else {
    document.getElementById("info-box").innerHTML =
      "Muted! Press ctrl-alt-m to unmute again.";
  }
  muted = !muted;
});

window.WorkAdventureDesktopApi.notify("Hello from front");
```
