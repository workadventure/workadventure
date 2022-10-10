import App from "./pusher/app";
import { PUSHER_HTTP_PORT } from "./pusher/enums/EnvironmentVariable";
App.listen(PUSHER_HTTP_PORT, () => console.log(`WorkAdventure starting on port ${PUSHER_HTTP_PORT}!`));
