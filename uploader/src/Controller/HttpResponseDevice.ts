import {Readable} from "stream";
import {mimeTypeManager} from "../Service/MimeType";
import {TargetDevice} from "../Service/TargetDevice";
import {Response} from "express";

export class HttpResponseDevice implements TargetDevice {
    constructor(private id: string, private response: Response) {
    }

    copyFromLink(link: string): void {
        this.response.redirect(link);
    }

    copyFromBuffer(buffer: Buffer | undefined | null): void {
        if (buffer == undefined) {
            this.response.status(404).send("Cannot find file");
            return;
        }

        this.response.status(200);

        const mimeType = mimeTypeManager.getMimeTypeByFileName(this.id);
        if (mimeType !== false) {
            this.response.type(mimeType);
        }

        this.response.send(buffer);
    }
}
