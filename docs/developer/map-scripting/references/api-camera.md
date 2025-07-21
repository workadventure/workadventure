---
sidebar_position: 1
---

# Camera

### Start following player

```javascript
WA.camera.followPlayer(smooth: boolean): void
```

Set camera to follow the player. Set `smooth` to true for smooth transition.

### Set spot for camera to look at

```javascript
WA.camera.set(
    x: number,
    y: number,
    width?: number,
    height?: number,
    lock: boolean = false,
    smooth: boolean = false,
    duration?: number,
): void
```

Set camera to look at given spot.
Setting `width` and `height` will adjust zoom.
Set `lock` to true to lock camera in this position.
Set `smooth` to true for smooth transition.
Set `duration` to number in millisecond for smooth transition.

### Listen to camera updates

```
WA.camera.onCameraUpdate(): Subscription
```

Listens to updates of the camera viewport. It will trigger for every update of the camera's properties (position or scale for instance). An event will be sent.

The event has the following attributes :

- **x (number):** coordinate X of the camera's world view (the area looked at by the camera).
- **y (number):** coordinate Y of the camera's world view.
- **width (number):** the width of the camera's world view.
- **height (number):** the height of the camera's world view.

**callback:** the function that will be called when the camera is updated.

Example :

```javascript
const subscription = WA.camera
  .onCameraUpdate()
  .subscribe((worldView) => console.log(worldView));
//later...
subscription.unsubscribe();
```
