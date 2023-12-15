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
