// lib/app.ts
import type {Express, NextFunction, Request, Response} from 'express';
import express from 'express';
import cors from 'cors';
import bodyParser from "body-parser";
import morgan from "morgan";
import multer from "multer";
import {FileController} from "./Controller/FileController";
import {ALLOWED_CORS_ORIGIN, MAX_UPLOAD_SIZE} from "./Enum/EnvironmentVariable";

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

        // Registered last: multer aborts an upload that is over the limit by handing the error to
        // the next error middleware.
        this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
            if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
                res.status(413).json({
                    message: "file-too-big",
                    maxFileSize: MAX_UPLOAD_SIZE.toString()
                });
                return;
            }
            next(err);
        });
    }
}

export default new App().app;
