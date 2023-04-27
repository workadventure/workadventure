
# @workadventure/room-api-client

Easily create a GRPC client to connect your service to the [Room API](https://github.com/thecodingmachine/workadventure/blob/master/docs/master/roomAPI.md) of a [WorkAdventure](https://workadventu.re) server.


## Installation

```bash
  npm install @workadventure/room-api-client
```

## Usage/Examples

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
const roomUrl = "https://play.workadventu.re/@/my-team/my-world";

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

## Warning

You can see in the example we are using the `Value.unwrap` function, this is because the variable functions return a `Value` object, which is a wrapper around the actual value. This is because the functions can return nothing due to an error, and the `Value` object allows you to check if the value is an error or not.
