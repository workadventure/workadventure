import { dialog, shell } from "electron";
import electronIsDev from "electron-is-dev";
import log from "electron-log";

import settings from "./settings";

function onError(e: Error) {
  try {
    log.error(e);

    dialog.showErrorBox(
      "WorkAdventure - A JavaScript error occurred",
      e.stack || ""
    );
  } catch (logError) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
}

function onRejection(reason: Error) {
  if (reason instanceof Error) {
    let _reason = reason;
    const errPrototype = Object.getPrototypeOf(reason);
    const nameProperty = Object.getOwnPropertyDescriptor(errPrototype, "name");

    if (!nameProperty || !nameProperty.writable) {
      _reason = new Error(reason.message);
    }

    _reason.name = `UnhandledRejection ${_reason.name}`;
    onError(_reason);
    return;
  }

  const error = new Error(JSON.stringify(reason));
  error.name = "UnhandledRejection";
  onError(error);
}

function init() {
  const logLevel = settings.get("log_level", "info");
  log.transports.file.level = logLevel;
  log.transports.console.level = logLevel;

  // eslint-disable-next-line no-console
  console.log = log.log.bind(log);

  if (!electronIsDev) {
    log.transports.file.fileName = "work-adventure.log";
  } else {
    console.log("Log file is disabled in dev. Using console output instead.");
  }

  process.on("uncaughtException", onError);
  process.on("unhandledRejection", onRejection);
}

export async function openLog() {
  const logFilePath = log.transports.file.getFile().path;
  await shell.openPath(logFilePath);
}

export default {
  init,
};
