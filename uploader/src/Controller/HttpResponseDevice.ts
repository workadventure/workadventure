import {HttpResponse} from "uWebSockets.js";
import {Readable} from "stream";
import {mimeTypeManager} from "../Service/MimeType";
import {addCorsHeaders} from "./addCorsHeaders";
import {TargetDevice} from "../Service/TargetDevice";

export class HttpResponseDevice implements TargetDevice {
    constructor(private id: string, private res: HttpResponse) {
    }

    copyFromLink(link: string): void {
        this.res.writeStatus('302')
        this.res.writeHeader("Location", link)

        addCorsHeaders(this.res)
        this.res.end()
    }

    copyFromBuffer(buffer: Buffer | undefined | null): void {
        try {
            addCorsHeaders(this.res)
            if (buffer == undefined) {
                this.res.writeStatus("404 Not found");
                this.res.end("Cannot find file");
                return;
            }

            const readable = new Readable()
            readable._read = () => {
            } // _read is required but you can noop it
            readable.push(buffer);
            readable.push(null);

            const size = buffer.byteLength;

            this.res.writeStatus("200 OK");
            //TODO manage type with the extension of file
            const mimeType = mimeTypeManager.getMimeTypeByFileName(this.id);
            if (mimeType !== false) {
                this.res.writeHeader("Content-Type", mimeType);
            }

            readable.on('data', buffer => {
                const chunk = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
                    lastOffset = this.res.getWriteOffset();

                // First try
                const [ok, done] = this.res.tryEnd(chunk, size);

                if (done) {
                    readable.destroy();
                } else if (!ok) {
                    // pause because backpressure
                    readable.pause();

                    // Save unsent chunk for later
                    this.res.ab = chunk;
                    this.res.abOffset = lastOffset;

                    // Register async handlers for drainage
                    this.res.onWritable(offset => {
                        const [ok, done] = this.res.tryEnd(this.res.ab.slice(offset - this.res.abOffset), size);
                        if (done) {
                            readable.destroy();
                        } else if (ok) {
                            readable.resume();
                        }
                        return ok;
                    });
                }
            });
        } catch (err) {
            console.error("downloadFile => An error happened", err);
            this.res.writeStatus("500 Internal Server Error");
            this.res.end('An error happened');
        }
    }
}
