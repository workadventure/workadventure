---
sidebar_position: 1
---

# Controls

### Disabling / restoring controls

```
WA.controls.disablePlayerControls(): void
WA.controls.restorePlayerControls(): void
```

These 2 methods can be used to completely disable player controls and to enable them again.

When controls are disabled, the user cannot move anymore using keyboard input. This can be useful in a "First Time User Experience" part, to display an important message to a user before letting him/her move again.

Example:

```ts
WA.room.onEnterLayer('myZone').subscribe(() => {
    WA.controls.disablePlayerControls();
    WA.ui.openPopup("popupRectangle", 'This is an imporant message!', [{
        label: "Got it!",
        className: "primary",
        callback: (popup) => {
            WA.controls.restorePlayerControls();
            popup.close();
        }
    }]);
});
```

### Disabling / restoring webcam or microphone

```
WA.controls.disableWebcam(): void
WA.controls.restoreWebcam(): void
WA.controls.disableMicrophone(): void
WA.controls.restoreMicrophone(): void
```

These methods can be used to completely disable player webcam or microphone and to enable them again.

Example:

```ts
WA.room.onEnterLayer('myZone').subscribe(() => {
    WA.controls.disableWebcam();
    WA.controls.disableMicrophone();
});

WA.room.onLeaveLayer('myZone').subscribe(() => {
    WA.controls.restoreWebcam();
    WA.controls.restoreMicrophone();
});
```

### Turn off webcam or microphone

```
WA.controls.turnOffMicrophone(): void
WA.controls.turnOffWebcam(): void
```

These methods can be used to turn off player webcam or microphone.

Example:

```ts
WA.room.onEnterLayer('myZone').subscribe(() => {
    WA.controls.turnOffMicrophone();
    WA.controls.turnOffWebcam();
});
```

### Disabling / restoring proximity meeting

```
WA.controls.disablePlayerProximityMeeting(): void
WA.controls.restorePlayerProximityMeeting(): void
```

These 2 methods can be used to completely disable player proximity meeting and to enable them again.

When proximity meeting are disabled, the user cannot speak with anyone.

Example:

```ts
WA.room.onEnterLayer('myZone').subscribe(() => {
    WA.controls.disablePlayerProximityMeeting();
});

WA.room.onLeaveLayer('myZone').subscribe(() => {
    WA.controls.restorePlayerProximityMeeting();
});
```

### Disabling / restoring map editor

```
WA.controls.disableMapEditor(): void
WA.controls.restoreMapEditor(): void
```

These 2 methods can be used to completely disable map editor and to enable it again.

When the map editor is disabled, the user cannot open the map editor and the tools associated.

Example:

```ts
WA.room.onEnterLayer('myZone').subscribe(() => {
    WA.controls.disableMapEditor();
});

WA.room.onLeaveLayer('myZone').subscribe(() => {
    WA.controls.restoreMapEditor();
});
```

### Disabling / restoring screen sharing

```
WA.controls.disableScreenSharing(): void
WA.controls.restoreScreenSharing(): void
```

These 2 methods can be used to completely disable screen sharing and to enable it again.

When screen sharing is disabled, the user cannot share any screen in the meeting zone.

Example:

```ts
WA.room.onEnterLayer('myZone').subscribe(() => {
    WA.controls.disableScreenSharing();
});

WA.room.onLeaveLayer('myZone').subscribe(() => {
    WA.controls.restoreScreenSharing();
});
```

### Disabling / restoring wheel zoom

```
WA.controls.disableWheelZoom(): void
WA.controls.restoreWheelZoom(): void
```

This feature allows or disables the use of zoom in and zoom out using the mouse wheel.

To enable or disable the wheel zoom feature, you can use the following code:

Example:

```ts
WA.room.onEnterLayer('myZone').subscribe(() => {
    WA.controls.disableWheelZoom();
});

WA.room.onLeaveLayer('myZone').subscribe(() => {
    WA.controls.restoreWheelZoom();
});
```

### Disabling / restoring right click button
```
WA.controls.disableWheelZoom(): void
WA.controls.restoreWheelZoom(): void
```

These 2 methods can be used to completely disable right click and to enable it again.

When right click is disabled, the user cannot move using the mouse by right clicking on the destination. It also disables
moving with a "tap" on the screen in mobile mode.

Example:

```ts
WA.room.onEnterLayer('myZone').subscribe(() => {
    WA.controls.disableRightClick();
});

WA.room.onLeaveLayer('myZone').subscribe(() => {
    WA.controls.restoreRightClick();
});
```

### Disabling / restoring invite user button

```
WA.controls.disableInviteButton(): void
WA.controls.restoreInviteButton(): void
```

These 2 methods can be used to completely disable invite button and to enable it again.

Example:

```ts
WA.room.onEnterLayer('myZone').subscribe(() => {
    WA.controls.disableInviteButton();
});

WA.room.onLeaveLayer('myZone').subscribe(() => {
    WA.controls.restoreInviteButton();
});
```

### Disabling / restoring the room list button

```
WA.controls.disableRoomList(): void
WA.controls.restoreRoomList(): void
```

These 2 methods can be used to remove or restore the room list button in the action bar.

Example:

```ts
WA.room.onEnterLayer('myZone').subscribe(() => {
    WA.controls.disableRoomList();
});

WA.room.onLeaveLayer('myZone').subscribe(() => {
    WA.controls.restoreRoomList();
});
```
