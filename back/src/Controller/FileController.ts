import {Application, Request, Response} from "express";
import {OK} from "http-status-codes";
import {URL_ROOM_STARTED} from "_Enum/EnvironmentVariable";
import {uuid} from "uuidv4";

export class FileController {
    App : Application;

    constructor(App : Application) {
        this.App = App;
        this.uploadAudioMessage();
        this.downloadAudioMessage();
    }

    uploadAudioMessage(){
        this.App.post("/upload-audio-message", (req: Request, res: Response) => {
            //TODO check user connected and admin role
            //TODO upload audio message
            const audioMessageId = uuid();
            return res.status(OK).send({
                id: audioMessageId,
                audioMessageUrl: `/audi-message/${audioMessageId}`,
            });
        });
    }

    downloadAudioMessage(){
        this.App.post("/download-audio-message/:id", (req: Request, res: Response) => {
            //TODO check user connected and admin role
            //TODO upload audio message
            let audiMessageId = req.params.id;

            let fs = require('fs');
            let path = `/dist/files/${audiMessageId}`;
            let file = fs.createReadStream(path);
            res.writeHead(200);
            file.pipe(res);
        });
    }
}