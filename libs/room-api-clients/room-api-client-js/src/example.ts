import { Value } from "./compiled_proto/google/protobuf/struct";
import { createRoomApiClient } from "./index";

const apiKey = process.env.ROOM_API_SECRET_KEY;

if (!apiKey) {
  throw new Error("No ROOM_API_SECRET_KEY defined on environment variables!");
}

const client = createRoomApiClient(apiKey, "room-api.workadventure.localhost");

async function init() {
  // Save a variable (In 5sec)
  await client.saveVariable({
    name: "textField",
    room: "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json",
    value: "Default Value",
  });

  console.log("Value saved: Default Value");

  // Read a variable
  const value = await client.readVariable({
    name: "textField",
    room: "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json",
  });

  console.log("Value read:", Value.unwrap(value));

  // Save a variable (In 5sec)
  setTimeout(async () => {
    await client.saveVariable({
      name: "textField",
      room: "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json",
      value: "New Value",
    });

    console.log("Value saved: New Value");
  }, 5000);

  // Listen a variable
  const listenVariable = client.listenVariable({
    name: "textField",
    room: "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json",
  });

  for await (const value of listenVariable) {
    console.log("Value listened:", Value.unwrap(value));
    break;
  }
}

init();
