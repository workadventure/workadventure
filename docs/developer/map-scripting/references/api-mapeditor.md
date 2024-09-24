---
sidebar_position: 1
---

# Mapeditor

We opted for a different approach to the event's detection of 'enter' and 'leave' zones when dealing with an area edited by the map editor.

## Detecting when the user enters/leaves an area edited by the map editor

```ts
WA.mapEditor.onEnter(name: string): Subscription
WA.mapEditor.onLeave(name: string): Subscription
```

Listens to the position of the current user. The event is triggered when the user enters or leaves a given area.

- **name**: the name of the layer who as defined in Tiled.

Example:

```ts
const myAreaSubscriber = WA.mapEditor.onEnter("myAreaName").subscribe(() => {
  WA.chat.sendChatMessage("Hello!", "Mr Robot");
});

WA.mapEditor.onLeave("myAreaName").subscribe(() => {
  WA.chat.sendChatMessage("Goodbye!", "Mr Robot");
  myAreaSubscriber.unsubscribe();
});
```