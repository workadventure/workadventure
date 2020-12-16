import {App} from "../Server/sifrr.server";

import {v4} from "uuid";
import {HttpRequest, HttpResponse} from "uWebSockets.js";
import {BaseController} from "./BaseController";
import { Readable } from 'stream'

interface UploadedFileBuffer {
    buffer: Buffer,
    expireDate: Date
}

export class FileController extends BaseController {
    private uploadedFileBuffers: Map<string, UploadedFileBuffer> = new Map<string, UploadedFileBuffer>();

    constructor(private App : App) {
        super();
        this.App = App;
        this.uploadAudioMessage();
        this.downloadAudioMessage();

        // Cleanup every 1 minute
        setInterval(this.cleanup.bind(this), 60000);
    }

    /**
     * Clean memory from old files
     */
    cleanup(): void {
        const now = new Date();
        for (const [id, file] of this.uploadedFileBuffers) {
            if (file.expireDate < now) {
                this.uploadedFileBuffers.delete(id);
            }
        }
    }

    uploadAudioMessage(){
        this.App.options("/upload-audio-message", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);

            res.end();
        });

        this.App.post("/upload-audio-message", (res: HttpResponse, req: HttpRequest) => {
            (async () => {
                res.onAborted(() => {
                    console.warn('upload-audio-message request was aborted');
                })

                try {
                    const audioMessageId = v4();

                    const params = await res.formData({
                        onFile: (fieldname: string,
                                 file: NodeJS.ReadableStream,
                                 filename: string,
                                 encoding: string,
                                 mimetype: string) => {
                            (async () => {
                                console.log('READING FILE', fieldname)

                                const chunks: Buffer[] = []
                                for await (const chunk of file) {
                                    if (!(chunk instanceof Buffer)) {
                                        throw new Error('Unexpected chunk');
                                    }
                                    chunks.push(chunk)
                                }
                                // Let's expire in 1 minute.
                                const expireDate = new Date();
                                expireDate.setMinutes(expireDate.getMinutes() + 1);
                                this.uploadedFileBuffers.set(audioMessageId, {
                                    buffer: Buffer.concat(chunks),
                                    expireDate
                                });
                            })();
                        }
                    });

                    res.writeStatus("200 OK");
                    this.addCorsHeaders(res);
                    res.end(JSON.stringify({
                        id: audioMessageId,
                        path: `/download-audio-message/${audioMessageId}`
                    }));

                } catch (e) {
                    console.log("An error happened", e)
                    res.writeStatus(e.status || "500 Internal Server Error");
                    this.addCorsHeaders(res);
                    res.end('An error happened');
                }
            })();
        });
    }

    downloadAudioMessage(){
        this.App.options("/download-audio-message/*", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);

            res.end();
        });

        this.App.get("/download-audio-message/:id", (res: HttpResponse, req: HttpRequest) => {

            res.onAborted(() => {
                console.warn('download-audio-message request was aborted');
            })

            const id = req.getParameter(0);

            const file = this.uploadedFileBuffers.get(id);
            if (file === undefined) {
                res.writeStatus("404 Not found");
                this.addCorsHeaders(res);
                res.end("Cannot find file");
                return;
            }

            const readable = new Readable()
            readable._read = () => {} // _read is required but you can noop it
            readable.push(file.buffer);
            readable.push(null);

            const size = file.buffer.byteLength;

            res.writeStatus("200 OK");

            readable.on('data', buffer => {
                const chunk = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
                    lastOffset = res.getWriteOffset();

                // First try
                const [ok, done] = res.tryEnd(chunk, size);

                if (done) {
                    readable.destroy();
                } else if (!ok) {
                    // pause because backpressure
                    readable.pause();

                    // Save unsent chunk for later
                    res.ab = chunk;
                    res.abOffset = lastOffset;

                    // Register async handlers for drainage
                    res.onWritable(offset => {
                        const [ok, done] = res.tryEnd(res.ab.slice(offset - res.abOffset), size);
                        if (done) {
                            readable.destroy();
                        } else if (ok) {
                            readable.resume();
                        }
                        return ok;
                    });
                }
            });
        });
    }
}
