import App from "./pusher/app";
import { PUSHER_HTTP_PORT } from "./pusher/enums/EnvironmentVariable";
import fs from "fs";
import process from "process";

// In production, the current working directory is "dist".
if (fs.existsSync("dist") && !fs.existsSync("src")) {
    process.chdir("dist");
}

App.listen(PUSHER_HTTP_PORT, () => console.log(`WorkAdventure starting on port ${PUSHER_HTTP_PORT}!`));
