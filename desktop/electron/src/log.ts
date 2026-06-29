import { dialog, shell } from "electron";
import ElectronLog from "electron-log";
import log from "electron-log";
import { redactSensitiveString } from "./desktop-url-policy";

function redactValue(value: unknown): unknown {
    if (typeof value === "string") {
        return redactSensitiveString(value);
    }
    if (value && typeof value === "object") {
        try {
            return JSON.parse(redactSensitiveString(JSON.stringify(value)) ?? "null");
        } catch {
            return value;
        }
    }
    return value;
}

function installRedactionHook() {
    log.hooks.push((message) => {
        try {
            message.data = (message.data ?? []).map(redactValue);
        } catch {
            // best-effort redaction; never let a logger hook crash the app
        }
        return message;
    });
}

function onError(e: Error) {
    try {
        log.error(e);

        dialog.showErrorBox("WorkAdventure - A JavaScript error occurred", e.stack || "");
    } catch (logError) {
        console.error(e);
    }
}

function onRejection(reason: Error) {
    if (reason instanceof Error) {
        let _reason = reason;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
    installRedactionHook();
    console.log = log.log.bind(log);

    process.on("uncaughtException", onError);
    process.on("unhandledRejection", onRejection);
}

export async function openLog() {
    const logFilePath = log.transports.file.getFile().path;
    await shell.openPath(logFilePath);
}

export function setLogLevel(logLevel: ElectronLog.LogLevel) {
    log.transports.console.level = logLevel;
    log.transports.file.level = logLevel;
}

export default {
    init,
};
