import { Value } from "./compiled_proto/google/protobuf/struct";
import { createRoomApiClient } from "./index";

const apiKey = process.env.ROOM_API_SECRET_KEY;

if (!apiKey) {
  throw new Error("No ROOM_API_SECRET_KEY defined on environment variables!");
}

const client = createRoomApiClient(apiKey, "room-api.workadventure.localhost", 80);

const roomUrl = "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json";
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

  console.log("Value read plain:", value);
  console.log("Value read:", Value.unwrap(value));

  // Save a variable in 5sec
  setTimeout(() => {
    client.saveVariable({
      name: variableName,
      room: roomUrl,
      value: "New Value",
    }).then(() => {
      console.log("Value saved: New Value");
    }).catch(e => console.error(e));

  }, 5000);

  // Listen a variable
  const listenVariable = client.listenVariable({
    name: variableName,
    room: roomUrl,
  });

  for await (const value of listenVariable) {
    console.log("Value listened plain:", value);
    console.log("Value listened:", Value.unwrap(value));
    break;
  }
}

init().catch(e => console.error(e));
