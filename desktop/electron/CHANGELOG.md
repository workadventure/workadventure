# Changelog

## [2.0.0-beta.9](https://github.com/workadventure/workadventure/compare/desktop-v2.0.0-beta.8...desktop-v2.0.0-beta.9) (2026-11-20)


### Bug Fixes

* **desktop:** remove the temporary auto-update test comment ([#7070](https://github.com/workadventure/workadventure/issues/7070)) ([7d16633](https://github.com/workadventure/workadventure/commit/7d16633e60af09157beb120917b6451049059f3b))

## [2.0.0-beta.8](https://github.com/workadventure/workadventure/compare/desktop-v2.0.0-beta.7...desktop-v2.0.0-beta.8) (2026-11-20)


### Bug Fixes

* **desktop:** relaunch the app after "Install and Restart" ([#7068](https://github.com/workadventure/workadventure/issues/7068)) ([0fcb97e](https://github.com/workadventure/workadventure/commit/0fcb97eee2f2505a582f335fc46a583845c1fbdd))

## [2.0.0-beta.7](https://github.com/workadventure/workadventure/compare/desktop-v2.0.0-beta.6...desktop-v2.0.0-beta.7) (2026-11-20)


### Bug Fixes

* **desktop:** sign in and out of worlds whose pusher is on another host ([6b25dc6](https://github.com/workadventure/workadventure/commit/6b25dc66bf5e5c601e6f34b39f57ae792d974f68))
* **desktop:** stop the update prompt from freezing the app on macOS ([e2dd7df](https://github.com/workadventure/workadventure/commit/e2dd7dfe04d71772481df7cc79d340db586874da))

## [2.0.0-beta.6](https://github.com/workadventure/workadventure/compare/desktop-v2.0.0-beta.5...desktop-v2.0.0-beta.6) (2026-11-19)


### Features

* **desktop:** keep running in the tray when the window is closed ([4fcc6f9](https://github.com/workadventure/workadventure/commit/4fcc6f9ac576738b023269b66c462f782d11e9db))
* **desktop:** sign and notarize the macOS app with the Developer ID certificate ([980806f](https://github.com/workadventure/workadventure/commit/980806f3821fddb4e2919b044de4564fb2e320ec))
* **desktop:** start in the tray when the computer starts the app ([#7049](https://github.com/workadventure/workadventure/issues/7049)) ([a004173](https://github.com/workadventure/workadventure/commit/a0041738f7bbb33425087ff8a7ef4733e2046357))


### Bug Fixes

* **desktop:** show the release name, not raw HTML, in the Windows update dialog ([eb60bc3](https://github.com/workadventure/workadventure/commit/eb60bc305ba22695a507ebb9ae3eead29e819c2c))

## [2.0.0-beta.5](https://github.com/workadventure/workadventure/compare/desktop-v2.0.0-beta.4...desktop-v2.0.0-beta.5) (2026-11-17)


### Bug Fixes

* **desktop:** download chat files instead of opening them as a world ([871b2c2](https://github.com/workadventure/workadventure/commit/871b2c29a9cbdedf7c8e849e90c6a124d3dc180a))
* **desktop:** never show the administration in the app, fall back to the Landing ([9f955cf](https://github.com/workadventure/workadventure/commit/9f955cf7283cbbd582a73b462999073e053ca9c2))
* **desktop:** open only worlds in the app, other links in the browser ([59392ed](https://github.com/workadventure/workadventure/commit/59392ed3a63a6e8db16acc17ab29d484683deda0))

## [2.0.0-beta.4](https://github.com/workadventure/workadventure/compare/desktop-v2.0.0-beta.3...desktop-v2.0.0-beta.4) (2026-11-17)


### Features

* **desktop:** open the DevTools of the mini window and the meeting bar ([7eddc97](https://github.com/workadventure/workadventure/commit/7eddc976b833b224aa7cf8f89aac51f3e9b89e58))


### Bug Fixes

* **desktop:** show the mini window over full-screen apps ([40c0122](https://github.com/workadventure/workadventure/commit/40c0122fcb6a919a3871e03beac003b8d8a8b543))
* **desktop:** show the status WorkAdventure shows in the tray ([e0796bf](https://github.com/workadventure/workadventure/commit/e0796bf95b61e1bbf579925b635dd051452191af))
* **desktop:** trust the hosted service by origin, like any other server ([cf2c622](https://github.com/workadventure/workadventure/commit/cf2c62274562b0c14a853b9f7815d72599d81ced))

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
