## Version 1.3.9 - in dev

### BREAKING CHANGES

- Scripting API:
  - Changed function names: `restorePlayerControl` => `restorePlayerControls`, `disablePlayerControl` => `disablePlayerControls`.
    Please keep in mind that the scripting API is still experimental. Some breaking changes can occur in it until we mark it as stable.

### Updates

- Added the emote feature to WorkAdventure. (@Kharhamel, @Tabascoeye)
  - The emote menu can be opened by clicking on your character. 
  -  Clicking on one of its element will close the menu and play an emote above your character. 
  -  This emote can be seen by other players.
- Mobile support has been improved
  - WorkAdventure automatically sets the zoom level based on the viewport size to ensure a sensible size of the map is visible, whatever the viewport used
  - Mouse wheel support to zoom in / out
  - Pinch support on mobile to zoom in / out
  - Improved virtual joystick size (adapts to the zoom level)
- New scripting API features:
  - Use `WA.loadSound(): Sound` to load / play / stop a sound
  - Use `WA.showLayer(): void` to show a layer
  - Use `WA.hideLayer(): void` to hide a layer
  - Use `WA.setProperty() : void` to add or change existing property of a layer
  - Use `WA.onPlayerMove(): void` to track the movement of the current player
  - Use `WA.getCurrentUser(): Promise<User>` to get the ID, name and tags of the current player
  - Use `WA.getCurrentRoom(): Promise<Room>` to get the ID, JSON map file, url of the map of the current room and the layer where the current player started
  - Use `WA.registerMenuCommand(): void` to add a custom menu

### Bug Fixes

- Pinch gesture does no longer move the character

## Version 1.3.0

### New Features

* Maps can now contain "group" layers (layers that contain other layers) - #899 #779 (@Lurkars @moufmouf)

### Updates


### Bug Fixes
