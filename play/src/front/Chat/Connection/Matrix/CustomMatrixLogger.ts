import Debug from "debug";
import { Logger } from "matrix-js-sdk/lib/logger";

export class CustomLogger implements Logger {
    private namespace: string;

    private traceLogger: Debug.Debugger;
    private debugLogger: Debug.Debugger;
    private infoLogger: Debug.Debugger;

    constructor(namespace: string) {
        this.namespace = namespace;
        this.traceLogger = Debug(`${namespace}:trace`);
        this.debugLogger = Debug(`${namespace}:debug`);
        this.infoLogger = Debug(`${namespace}:info`);
    }

    getChild(namespace: string): Logger {
        return new CustomLogger(`${this.namespace}:${namespace}`);
    }

    trace(...msg: unknown[]): void {
        this.traceLogger(this.namespace, ...msg);
    }

    debug(...msg: unknown[]): void {
        this.debugLogger(this.namespace, ...msg);
    }

    info(...msg: unknown[]): void {
        this.infoLogger(this.namespace, ...msg);
    }

    warn(...msg: unknown[]): void {
        console.warn(this.namespace, ...msg);
    }

    error(...msg: unknown[]): void {
        console.error(this.namespace, ...msg);
    }
}

export const customMatrixLogger = new CustomLogger("matrix");
