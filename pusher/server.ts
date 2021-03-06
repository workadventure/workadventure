// lib/server.ts
import App from "./src/App";
import { PUSHER_HTTP_PORT } from "./src/Enum/EnvironmentVariable";
App.listen(PUSHER_HTTP_PORT, () => console.log(`WorkAdventure starting on port ${PUSHER_HTTP_PORT}!`))
