import app from "./app";
import log from "./log";
import settings from "./settings";

async function start() {
    await settings.init();
    log.init();
}

start();
app.init();
