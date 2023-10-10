---
sidebar_position: 1
---

# Event

The WorkAdventure event system allows to exchange messages between players of a same map, in real-time.

See the [events documentation](../events.md) for an introduction to the "events" concept.

## Broadcasting an event to all players of the map

To broadcast an event to all players of the map, use the `WA.room.dispatchEvent` method:

```typescript
WA.room.dispatchEvent(key: string, value: unknown): Promise<void>
```

- `key` (type: `string`): the name of the event
- `value` (type: `unknown`): the payload of the event. Can be any JSON-serializable value (including objects, arrays, strings, numbers, booleans, undefined, etc.).

The `dispatchEvent` method returns a promise that will be resolved when the event has successfully reached the server.

Example usage:

```typescript
WA.room.dispatchEvent("my-event", "my payload");
```

## Listening to events

Events can be listened to using `WA.event.onEventTriggered`.

```typescript
import type { Observable } from "rxjs";

type ScriptingEvent {
    key: string;
    value: unknown;
    senderId: number | undefined;
}

WA.event.onEventTriggered(key: string): Observable<ScriptingEvent>
```

`onEventTriggered` returns an [RxJS Observable](https://rxjs.dev/guide/observable). You can use the `subscribe` method
to listen to events. The `subscribe` method takes a callback function that will be called each time an event is received.
The callback function takes a single argument: the `event` object of type `ScriptingEvent`.

The `ScriptingEvent` contains the following fields:

- `value` (type: `unknown`): the payload of the event
- `key` (type: `string`): the name of the event
- `senderId` (type: `number`): the ID of the player that sent the event (or `undefined` if the event was sent by the system)

The `subscribe` method returns a `Subscription` object. You can use the `unsubscribe` method of this object to stop listening to events.

```typescript
const subscription = WA.event.onEventTriggered("my-event").subscribe((event) => {
    console.log("Event received", event.value);
});

// ...

subscription.unsubscribe();
```
