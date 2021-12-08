{.section-title.accent.text-primary}
# API Camera functions Reference

### Listen to camera updates

```
WA.camera.onCameraUpdate(callback: WasCameraUpdatedEventCallback): void
```

Listens to the updating of the camera linked to the player. It will trigger for every update of the camera's properties (position or scale for instance). An event will then be sent.

The event has the following attributes :
*   **x (number):** coordinate X of the camera's world view (the area looked at by the camera).
*   **y (number):** coordinate Y of the camera's world view.
*   **width (number):** the width of the camera's world view.
*   **height (number):** the height of the camera's world view.

**callback:** the function that will be called when the camera is updated.

Example :
```javascript
WA.camera.onCameraUpdate((worldView) => console.log(worldView));
```