import type {Response} from "express";
import {mimeTypeManager} from "../Service/MimeType";
import type {TargetDevice} from "../Service/TargetDevice";

export class HttpResponseDevice implements TargetDevice {
    /**
     * @param forceDownload When true, the file is sent as an attachment. Temporary audio messages
     *                      are played by an <audio> element and are served without it.
     */
    constructor(private id: string, private response: Response, private forceDownload = true) {
    }

    copyFromLink(link: string): void {
        this.setSecurityHeaders();
        this.response.redirect(link);
    }

    copyFromBuffer(buffer: Buffer | undefined | null): void {
        if (buffer == undefined) {
            this.response.status(404).send("Cannot find file");
            return;
        }

        this.setSecurityHeaders();
        this.response.status(200);

        // Never trust the extension of a user uploaded file to pick a content type: anything but
        // an image, an audio or a video file is served as a plain binary blob.
        this.response.type(mimeTypeManager.getSafeMimeTypeByFileName(this.id));

        if (this.forceDownload) {
            // No filename on purpose: the id is part of the URL and would need escaping here.
            this.response.setHeader("Content-Disposition", "attachment");
        }

        this.response.send(buffer);
    }

    /**
     * The uploader hands back files uploaded by users, so a browser must never interpret them as
     * active content on the uploader origin.
     */
    private setSecurityHeaders(): void {
        this.response.setHeader("X-Content-Type-Options", "nosniff");
        this.response.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    }
}
