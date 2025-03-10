
# @workadventure/room-api-client

Easily create a GRPC client to connect your service to the [Room API](https://docs.workadventu.re/developer/room-api) of a [WorkAdventure](https://workadventu.re) server.


## Installation

```bash
  npm install @workadventure/room-api-client
```

## Instantiating the client

Use the `createRoomApiClient` function to create a client.

The client expects an API key as first parameter. See [the Authentication section of the Room API documentation](https://docs.workadventu.re/developer/room-api)
to learn how to get your own API key.

```typescript
const client = createRoomApiClient("MY AWESOME KEY");
```

By default, the client targets the official WorkAdventure server. If you are using a self-hosted version, you 
must in addition pass in parameter the domain name and port of your WorkAdventure RoomApi endpoint.

```typescript
const client = createRoomApiClient("My AWESOME KEY", "play.example.com", "5221");
```

## Setting / Reading / Tracking variables

The Room API client allows you to set, read and track variables in a room using the following methods:

- `client.saveVariable({ name: string, room: string, value: unknown }): Promise<void>`
- `client.readVariable({ name: string, room: string }): Promise<Value>`
- `client.listenVariable({ name: string, room: string }): AsyncIterable<Value>`

> [!WARNING]
> `readVariable` and `listenVariable` return a `Value` object. To get the underlying value, you must call the `Value.unwrap` function.
> This is because the functions can return nothing due to an error, and the `Value` object allows you to check if the value is an error or not.


### Example

```javascript
import { createRoomApiClient } from "@workadventure/room-api-client";

/**
 * By default, the client targets the official WorkAdventure server,
 * but you can also define customs domain and port.
 * Example :
 * const client = createRoomApiClient("My AWESOME KEY", "mydomain.net", "5221");
 */
const client = createRoomApiClient("My AWESOME KEY");

// URL of the room you wish to interact with
const roomUrl = "https://play.workadventu.re/@/my-organization/my-world/my-room";

// Name of the variable with which you want to interact
const variableName = "textField";

async function init() {
  // Save a variable
  await client.saveVariable({
    name: variableName,
    room: roomUrl,
    value: "Default Value",
  });

  console.log("Value saved: Default Value");

  // Read a variable
  const value = await client.readVariable({
    name: variableName,
    room: roomUrl,
  });

  console.log("Value read:", Value.unwrap(value));

  // Save a variable in 5sec
  setTimeout(async () => {
    await client.saveVariable({
      name: variableName,
      room: roomUrl,
      value: "New Value",
    });

    console.log("Value saved: New Value");
  }, 5000);

  // Listen a variable
  const listenVariable = client.listenVariable({
    name: variableName,
    room: roomUrl,
  });

  for await (const value of listenVariable) {
    console.log("Value listened:", Value.unwrap(value));
    break;
  }
}

init();
```


## Sending events / listening to events

The Room API client allows you to send and listen to events in a room using the following methods:

- `client.broadcastEvent({ name: string, room: string, data: unknown }): Promise<void>`
- `client.listenToEvent({ name: string, room: string }): AsyncIterable<any>`

### Example

```javascript
import { createRoomApiClient } from "@workadventure/room-api-client";

/**
 * By default, the client targets the official WorkAdventure server,
 * but you can also define customs domain and port.
 * Example :
 * const client = createRoomApiClient("My AWESOME KEY", "mydomain.net", "5221");
 */
const client = createRoomApiClient("My AWESOME KEY");

// URL of the room you wish to interact with
const roomUrl = "https://play.workadventu.re/@/my-organization/my-world/my-room";

// Name of the event with which you want to interact
const eventName = "my-event";

async function init() {
  // Send an event in 5 seconds
  setTimeout(async () => {
    await client.broadcastEvent({
      name: eventName,
      room: roomUrl,
      data: "Default Value",
    });

    console.log("Event sent: Default Value");
  }, 5000);

  // Listen a event
  const events = client.listenToEvent({
    name: eventName,
    room: roomUrl,
  });

  for await (const event of events) {
    console.log("Event received:");
    console.log("Sender:", event.senderId);
    console.log("Value:", event.data);
    break;
  }
}

init();
```
