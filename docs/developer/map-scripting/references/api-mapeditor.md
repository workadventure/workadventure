---
sidebar_position: 1
---

# Map Editor API

Currently, the map editor API provides a way to read the areas defined in the map editor and to detect when the user enters or leaves an area.
It is "read-only". You cannot modify the map using this API.

We opted for a different approach to the event's detection of 'enter' and 'leave' zones when dealing with an area edited by the map editor.

## Detecting when the user enters/leaves an area edited by the map editor

```ts
WA.mapEditor.area.onEnter(name: string): Subscription
WA.mapEditor.area.onLeave(name: string): Subscription
```

Listens to the position of the current user. The event is triggered when the user enters or leaves a given area.

- **name**: the name of the area defined in the map editor.

Example:

```ts
const myAreaEnterSubscriber = WA.mapEditor.area.onEnter("myAreaName").subscribe(() => {
  WA.chat.sendChatMessage("Hello!", "Mr Robot");
});

const myAreaLeaveSubscriber = WA.mapEditor.area.onLeave("myAreaName").subscribe(() => {
  WA.chat.sendChatMessage("Goodbye!", "Mr Robot");
  myAreaSubscriber.unsubscribe();
});

// If you want to stop listening to the events at some point:
myAreaEnterSubscriber.unsubscribe();
myAreaLeaveSubscriber.unsubscribe();
```

## Getting the list of all areas created in the map editor

```ts
WA.mapEditor.area.list(): MapEditorArea[]
```

Returns the list of all areas created in the map editor.

```ts
interface MapEditorArea {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  description: string|undefined;
  searchable: boolean|undefined;
}
```

Example:

```ts
const areas = await WA.mapEditor.area.list();
for (const area of areas) {
  console.log(`Area ${area.name} at (${area.x}, ${area.y}) with width ${area.width} and height ${area.height}`);
}
```
