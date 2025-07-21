import { createRoomApiClient } from "./index";

const apiKey = process.env.ROOM_API_SECRET_KEY;

if (!apiKey) {
  throw new Error("No ROOM_API_SECRET_KEY defined on environment variables!");
}

const client = createRoomApiClient(
  apiKey,
  "room-api.workadventure.localhost",
  80
);

// URL of the room you wish to interact with
const roomUrl =
  "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json";

// Name of the event with which you want to interact
const eventName = "my-event";

async function init() {
  // Send an event in 5 seconds
  setTimeout(() => {
    console.log('Sending event: { foo: "Default Value" }');

    client
      .broadcastEvent({
        name: eventName,
        room: roomUrl,
        data: { foo: "Default Value" },
      })
      .then(() => {
        console.log('Event sent: { foo: "Default Value" }');
      })
      .catch((e) => {
        console.error("Error sending event:", e);
      });
  }, 1000);

  // Listen a event
  const events = client.listenToEvent({
    name: eventName,
    room: roomUrl,
  });

  for await (const event of events) {
    console.log("Event", event);
    console.log("Sender:", event.senderId);
    console.log("Value:", event.data);
    break;
  }
}

init().catch((e) => console.error(e));
