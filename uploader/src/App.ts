// lib/app.ts
import {FileController} from "./Controller/FileController";
import {App as uwsApp} from "./Server/sifrr.server";

class App {
    public app: uwsApp;
    public fileController: FileController;

    constructor() {
        this.app = new uwsApp();

        this.fileController = new FileController(this.app);
    }
}

export default new App().app;
