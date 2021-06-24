import { AppOptions, TemplatedApp, HttpResponse, HttpRequest } from "uWebSockets.js";

export type UwsApp = {
    (options: AppOptions): TemplatedApp;
    new (options: AppOptions): TemplatedApp;
    prototype: TemplatedApp;
};

export type Handler = (res: HttpResponse, req: HttpRequest) => void;

export {};
