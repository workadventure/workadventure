---
sidebar_position: 1
---

# Event

The WorkAdventure event system allows to exchange messages between players of a same map, in real-time.

See the [events documentation](../events.md) for an introduction to the "events" concept.

## Broadcasting an event to all players of the map

To broadcast an event to all players of the map, use the `WA.event.broadcast` method:

```typescript
WA.event.broadcast(key: string, data: unknown): Promise<void>
```

- `key` (type: `string`): the name of the event
- `data` (type: `unknown`): the payload of the event. Can be any JSON-serializable value (including objects, arrays, strings, numbers, booleans, undefined, etc.).

The `dispatchEvent` method returns a promise that will be resolved when the event has successfully reached the server.

Example usage:

```typescript
WA.event.broadcast("my-event", "my payload");
```

## Listening to events

Events can be listened to using `WA.event.on`.

```typescript
import type { Observable } from "rxjs";

type ScriptingEvent = {
    name: string;
    data: unknown;
    senderId: number | undefined;
}

WA.event.on(name: string): Observable<ScriptingEvent>
```

`on` returns an [RxJS Observable](https://rxjs.dev/guide/observable). You can use the `subscribe` method
to listen to events. The `subscribe` method takes a callback function that will be called each time an event is received.
The callback function takes a single argument: the `event` object of type `ScriptingEvent`.

The `ScriptingEvent` contains the following fields:

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
