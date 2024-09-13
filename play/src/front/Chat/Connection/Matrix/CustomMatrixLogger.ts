import Debug from "debug";
import { Logger } from "matrix-js-sdk/lib/logger";

const traceLogger = Debug("trace");
const debugLogger = Debug("debug");
const infoLogger = Debug("info");
const warnLogger = Debug("warn");
const errorLogger = Debug("error");

class CustomMatrixLogger implements Logger {
    private namespace: string;

    constructor(namespace: string) {
        this.namespace = namespace;
    }

    getChild(namespace: string): Logger {
        return new CustomMatrixLogger(`${this.namespace}:${namespace}`);
    }

    trace(...msg: unknown[]): void {
        traceLogger(this.namespace, ...msg);
    }

    debug(...msg: unknown[]): void {
        debugLogger(this.namespace, ...msg);
    }

    info(...msg: unknown[]): void {
        infoLogger(this.namespace, ...msg);
    }

    warn(...msg: unknown[]): void {
        warnLogger(this.namespace, ...msg);
    }

    error(...msg: unknown[]): void {
        errorLogger(this.namespace, ...msg);
    }
}

export const customMatrixLogger = new CustomMatrixLogger("matrix");
