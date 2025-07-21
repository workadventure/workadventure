---
sidebar_position: 20
---

# Events

The WorkAdventure scripting API runs in the browser of each player. If you want to exchange data between users of
a same map, you have 2 options:

- Using [variables](./variables.md)
- or using events (see below)

Variables are a good way to store data on the map, or attached to a player. You can also track the changes to a variable,
so variables can be used for real-time communication.

If you don't need to store data, but just want to send real-time short-lived messages between players, you can use **events**.

## Broadcast vs targeted events

An event can be sent:

- to all players in a room (broadcast)
- to a specific player (targeted)

## Broadcasting an event

To broadcast an event, use the `WA.event.broadcast` method:

```typescript
WA.event.broadcast("my-event", "my payload");
```

An event has a name (`my-event` in the example above), and a payload (`my payload` in the example above).

The payload can be any JSON-serializable value (including objects, arrays, strings, numbers, booleans, undefined, etc.).

## Targeting a player

If you are tracking users using the [players API](./references/api-players.md), you can target a specific player using the `RemotePlayer.sendEvent` method:

Example: let's send an event only to players that have the `admin` tag:

```typescript
await WA.players.configureTracking();
const players = WA.players.list();
for (const player of players) {
  if (player.tags.includes("admin")) {
    player.sendEvent("my-event", "my payload");
  }
}
```

## Listening to events

All events (whether they are broadcast or targeted) can be listened to using `WA.event.on`.

```typescript
WA.event.on("my-event").subscribe((event) => {
  console.log("Event received", event.data);
});
```

The `on` method returns an [RxJS Observable](https://rxjs.dev/guide/observable). You can use the `subscribe` method
to listen to events. The `subscribe` method takes a callback function that will be called each time an event is received.
The callback function takes a single argument: the `event` object that contain the following fields:

- `data` (type: `unknown`): the payload of the event
- `name` (type: `string`): the name of the event
- `senderId` (type: `number`): the ID of the player that sent the event (or `undefined` if the event was sent by the system)

The `subscribe` method returns a `Subscription` object. You can use the `unsubscribe` method of this object to stop listening to events.

```typescript
const subscription = WA.event.on("my-event").subscribe((event) => {
  console.log("Event received", event.data);
});

// ...

subscription.unsubscribe();
```

### A note about the `data` field

If you are using Typescript, the `data` field of the `event` object is of type `unknown`. This is because the type of the payload
is not known in advance. You can use a type assertion to tell Typescript what is the type of the payload:

```typescript
WA.event.on("my-event").subscribe((event) => {
  const payload = event.data as string;
  console.log("Event received", payload);
});
```

Please note that using a type assertion is not a type-safe operation. If you assert the wrong type, you will get a runtime error.
Furthermore, events are sent by other players, so you should not trust the type of the payload. If your code is to be used
publicly, you should always validate the type of the payload before using it.

:::tip Pro tip
Use [Zod](https://zod.dev/) to validate the type of the payload.

The example below validates the type of the payload of the event and ensures it is an object containing a `myField` field of type `string`:

```typescript
import { z } from "zod";

const myEventSchema = z.object({
  myField: z.string(),
});

WA.event.on("some-event").subscribe((event) => {
  const result = myEventSchema.safeParse(event.data);
  if (!result.success) {
    console.error("Invalid event payload", result.error);
    return;
  }
  const payload = result.data;

  console.log("Event received", payload.myField);
});
```

:::
