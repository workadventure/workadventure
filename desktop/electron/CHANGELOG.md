# Changelog

## [2.0.0-beta.3](https://github.com/workadventure/workadventure/compare/desktop-v2.0.0-beta.2...desktop-v2.0.0-beta.3) (2026-11-16)


### Features

* **desktop:** sign the Windows app with Azure Artifact Signing ([6224e8a](https://github.com/workadventure/workadventure/commit/6224e8a7f03d5ca7fad530b6368de4a7f0fe4515))


### Bug Fixes

* **desktop:** add a Back link to the sign-in page shown while the browser is open ([8efa24e](https://github.com/workadventure/workadventure/commit/8efa24ee5822cc304d713aabe018fa55dd7e8f10))
* **desktop:** restart in X11 mode without app.relaunch, which broke sign-in and the AppImage ([5789226](https://github.com/workadventure/workadventure/commit/57892267f94a44c95c248f709c14a8619d498455))
* **desktop:** take the sign-in page's Back link to the world or the Landing ([0112609](https://github.com/workadventure/workadventure/commit/011260982898e80469a4a03cc6e0e00eddecd305))

## [2.0.0-beta.2](https://github.com/workadventure/workadventure/compare/desktop-v2.0.0-beta.1...desktop-v2.0.0-beta.2) (2026-11-13)


### Features

* **desktop:** build a Windows installer for arm64 ([39d199e](https://github.com/workadventure/workadventure/commit/39d199e69a050f796a366bded6dc22c9c78e2443))
* **desktop:** build the Linux packages for arm64 too ([#7022](https://github.com/workadventure/workadventure/issues/7022)) ([90696ba](https://github.com/workadventure/workadventure/commit/90696ba2e10f3c676edcb8977e6511a050d3333c))
* **desktop:** drop the version from the installer file names ([f4743a1](https://github.com/workadventure/workadventure/commit/f4743a1d79f42277d232231ec1f5706c73d9efcb))


### Bug Fixes

* **desktop:** run the arm64 Windows check on branches and pull requests ([3f315dc](https://github.com/workadventure/workadventure/commit/3f315dc82c7d6656d53ec1885f9a71ec7f61112f))

## 2.0.0-beta.1 (2026-11-13)

First release of the new desktop app: WorkAdventure worlds in tabs, sign-in through the system browser,
`workadventure://` links, a companion window during meetings, picture-in-picture, global mute and camera
shortcuts, and a tray menu.

Desktop releases now have their own version and are published in
[workadventure/desktop-releases](https://github.com/workadventure/desktop-releases).
