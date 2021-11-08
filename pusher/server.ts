// lib/server.ts
import App from "./src/App";
import { PUSHER_HTTP_PORT } from "./src/Enum/EnvironmentVariable";
import log from "./src/Services/Logger";

App.listen(PUSHER_HTTP_PORT, () => log.info(`WorkAdventure starting on port ${PUSHER_HTTP_PORT}!`));
