import {Readable} from "stream";
import {mimeTypeManager} from "../Service/MimeType";
import {TargetDevice} from "../Service/TargetDevice";
import {Response} from "hyper-express/types/components/http/Response";

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

        const readable = new Readable()
        readable._read = () => {
        } // _read is required but you can noop it
        readable.push(buffer);
        readable.push(null);

        const size = buffer.byteLength;

        this.response.status(200);

        const mimeType = mimeTypeManager.getMimeTypeByFileName(this.id);
        if (mimeType !== false) {
            this.response.type(mimeType);
        }

        this.response.stream(readable);
    }
}
