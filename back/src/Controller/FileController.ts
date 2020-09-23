const multer =  require('multer');
import {Application, Request, RequestHandler, Response} from "express";
import {OK} from "http-status-codes";
import {URL_ROOM_STARTED} from "_Enum/EnvironmentVariable";
import {uuid} from "uuidv4";
import fs from "fs";

const upload = multer({ dest: 'dist/files/' });

class FileUpload{
    path: string
    constructor(path : string) {
        this.path = path;
    }
}

interface RequestFileHandlerInterface extends Request{
    file: FileUpload
}

export class FileController {
    App : Application;

    constructor(App : Application) {
        this.App = App;
        this.uploadAudioMessage();
        this.downloadAudioMessage();
    }

    uploadAudioMessage(){
        this.App.post("/upload-audio-message", (upload.single('file') as RequestHandler), (req: Request, res: Response) => {
            //TODO check user connected and admin role
            //TODO upload audio message
            const audioMessageId = uuid();

            fs.copyFileSync((req as RequestFileHandlerInterface).file.path, `dist/files/${audioMessageId}`);
            fs.unlinkSync((req as RequestFileHandlerInterface).file.path);

            return res.status(OK).send({
                id: audioMessageId,
                path: `/download-audio-message/${audioMessageId}`
            });
        });
    }

    downloadAudioMessage(){
        this.App.get("/download-audio-message/:id", (req: Request, res: Response) => {
            //TODO check user connected and admin role
            //TODO upload audio message
            const audiMessageId = req.params.id;

            const fs = require('fs');
            const path = `dist/files/${audiMessageId}`;
            const file = fs.createReadStream(path);
            res.writeHead(200);
            file.pipe(res);
        });
    }
}