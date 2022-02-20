# Desktop app

The desktop component is an electron app. It uses a hybrid setup based of two main components:
- A `local-app` bundled into the electron app. It has two main parts:
  - A sidebar to show the server list, with the currently selected server
  - A main page which is used to manage servers and to show other "local" pages like the options
- A BrowserView (often called `appView` or `app`) showing the actual frontend of an external WorkAdventure deployment.
  If a server is selected the BrowserView / `appView` is overlaying the main part right to the sidebar.

## Development

```bash
# start local-app
cd local-app/
yarn dev

# start electron app
LOCAL_APP_URL=http://localhost:3000 yarn dev

# or create an executable by running:
yarn bundle
```