import App from "./app";
import { PUSHER_HTTP_PORT } from "./enums/EnvironmentVariable";
App.listen(PUSHER_HTTP_PORT, () => console.log(`WorkAdventure starting on port ${PUSHER_HTTP_PORT}!`));
