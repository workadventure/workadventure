// lib/app.ts
import express, {Express} from 'express';
import cors from 'cors';
import bodyParser from "body-parser";
import morgan from "morgan";
import {FileController} from "./Controller/FileController";
import {ALLOWED_CORS_ORIGIN} from "./Enum/EnvironmentVariable";

class App {
    public app: Express;
    public fileController: FileController;

    constructor() {
        this.app = express();

        // Global middlewares
        this.app.use(cors({
            origin: ALLOWED_CORS_ORIGIN
        }));
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: true}));
        this.app.use(morgan('dev'));

        this.fileController = new FileController(this.app);
    }
}

export default new App().app;
