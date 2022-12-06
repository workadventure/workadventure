// lib/app.ts
import {FileController} from "./Controller/FileController";
import {Server} from "hyper-express";
import {cors} from "./Middlewares/Cors";
import {globalErrorHandler} from "./Service/GlobalErrorHandler";

class App {
    public app: Server;
    public fileController: FileController;

    constructor() {
        this.app = new Server();

        // Global middlewares
        this.app.use(cors);

        this.app.set_error_handler(globalErrorHandler);

        this.app.set_not_found_handler(((request, response) => {
            response.status(404).send("Uploader - Page not found");
        }));

        this.fileController = new FileController(this.app);
    }
}

export default new App().app;
