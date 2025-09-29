import { Application } from "express";

export interface ExtensionModuleOptions {
    app: Application;
}

export interface ExtensionModule {
    id: string;
    init: (options: ExtensionModuleOptions) => void;
}
