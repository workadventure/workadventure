{.section-title.accent.text-primary}
# API Controls functions Reference

### Disabling / restoring controls

```
WA.controls.disablePlayerControls(): void
WA.controls.restorePlayerControls(): void
```

These 2 methods can be used to completely disable player controls and to enable them again.

When controls are disabled, the user cannot move anymore using keyboard input. This can be useful in a "First Time User Experience" part, to display an important message to a user before letting him/her move again.

Example:

```javascript
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
})
```
