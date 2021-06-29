## Version 1.4.2 

## Updates 

- A script in an iframe opened by another script can use the IFrame API.

## Version 1.4.0

### BREAKING CHANGES

- Scripting API:
  - Changed function names: `restorePlayerControl` => `restorePlayerControls`, `disablePlayerControl` => `disablePlayerControls`.
    Please keep in mind that the scripting API is still experimental. Some breaking changes can occur in it until we mark it as stable.

### Updates

- Added the emote feature to WorkAdventure. (@Kharhamel, @Tabascoeye)
  - The emote menu can be opened by clicking on your character. 
  -  Clicking on one of its element will close the menu and play an emote above your character. 
  -  This emote can be seen by other players.
- Player names were improved. (@Kharhamel)
  - We now create a GameObject.Text instead of GameObject.BitmapText
  - now use the 'Press Start 2P' font family and added an outline
  - As a result, we can now allow non-standard letters like french accents or chinese characters!
  
- Added the contact card feature. (@Kharhamel)
  - Click on another player to see its contact info.
  - Premium-only feature unfortunately. I need to find a way to make it available for all.
  - If no contact data is found (either because the user is anonymous or because no admin backend), display an error card.

- Mobile support has been improved
  - WorkAdventure automatically sets the zoom level based on the viewport size to ensure a sensible size of the map is visible, whatever the viewport used
  - Mouse wheel support to zoom in / out
  - Pinch support on mobile to zoom in / out
  - Improved virtual joystick size (adapts to the zoom level)
- Redesigned intermediate scenes
  - Redesigned Select Companion scene
  - Redesigned Enter Your Name scene
    - Added a new `DISPLAY_TERMS_OF_USE` environment variable to trigger the display of terms of use  
- New scripting API features:
  - Use `WA.loadSound(): Sound` to load / play / stop a sound

### Bug Fixes

- Pinch gesture does no longer move the character

## Version 1.3.0

### New Features

* Maps can now contain "group" layers (layers that contain other layers) - #899 #779 (@Lurkars @moufmouf)

### Updates


### Bug Fixes
