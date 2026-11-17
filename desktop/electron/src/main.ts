import app from "./app";
import log, { onError } from "./log";

log.init();
// The error dialog is the only sign of a failed start: there may be no window, nor tray.
app.init().catch(onError);
