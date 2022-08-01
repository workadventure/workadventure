import {App} from "../Server/sifrr.server";

import {v4} from "uuid";
import {HttpRequest, HttpResponse} from "uWebSockets.js";
import {BaseController} from "./BaseController";
import {Readable} from 'stream'
import { uploaderService } from "../Service/UploaderService";

interface UploadedFileBuffer {
    buffer: Buffer,
    expireDate?: Date
}

export class FileController extends BaseController {
    //TODO migrate in upload file service
    private uploadedFileBuffers: Map<string, UploadedFileBuffer> = new Map<string, UploadedFileBuffer>();

    constructor(private App : App) {
        super();
        this.App = App;

        this.uploadAudioMessage();
        this.downloadAudioMessage();
        this.downloadFile();
        this.uploadFile();
        this.deleteUploadedFile();

        // Cleanup every 1 minute
        setInterval(this.cleanup.bind(this), 60000);
    }

    /**
     * Clean memory from old files
     */
    cleanup(): void {
        const now = new Date();
        for (const [id, file] of this.uploadedFileBuffers) {
            if (file.expireDate && file.expireDate < now) {
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
                    console.error("An error happened", e)
                    res.writeStatus("500 Internal Server Error");
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

    downloadFile(){
        this.App.options("/download-file/*", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);

            res.end();
        });

        this.App.get("/download-file/:id", (res: HttpResponse, req: HttpRequest) => {
            (async () => {
                res.onAborted(() => {
                    console.warn('download file request was aborted');
                })

                const id = req.getParameter(0);
                try{
                    const fileBuffer = await uploaderService.get(id);
                    if (fileBuffer == undefined) {
                        res.writeStatus("404 Not found");
                        this.addCorsHeaders(res);
                        res.end("Cannot find file");
                        return;
                    }

                    const readable = new Readable()
                    readable._read = () => {} // _read is required but you can noop it
                    readable.push(fileBuffer);
                    readable.push(null);

                    const size = fileBuffer.byteLength;

                    res.writeStatus("200 OK");
                    //TODO manage type with the extension of file
                    //res.writeHeader("Content-Type", "image/png");

                    return readable.on('data', buffer => {
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
                }catch(err){
                    console.error("deleteUploadedFile => An error happened", err)
                    res.writeStatus("500 Internal Server Error");
                    this.addCorsHeaders(res);
                    return res.end('An error happened');
                }
            })();
        });
    }

    uploadFile(){
        this.App.options("/upload-file", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);
            res.end();
        });

        this.App.post("/upload-file", (res: HttpResponse, req: HttpRequest) => {
            (async () => {
                res.onAborted(() => {
                    console.warn('upload-audio-message request was aborted');
                })

                try {
                    const chunksByFile: Map<string, Buffer> = new Map<string, Buffer>();
                    const params = await res.formData({
                        onFile: (fieldname: string, file: NodeJS.ReadableStream, filename: string, encoding: string, mimetype: string) => {
                            (async () => {
                                console.log('READING FILE', filename, encoding, mimetype);
                                
                                const chunks: Buffer[] = [];
                                for await (const chunk of file) {
                                    if (!(chunk instanceof Buffer)) {
                                        throw new Error('Unexpected chunk');
                                    }
                                    chunks.push(chunk)
                                    chunksByFile.set(filename, Buffer.concat(chunks));
                                }
                            })();
                        }
                    });

                    if(params == undefined || chunksByFile.size === 0){
                        throw new Error('no file name');
                    }
                    
                    const uploadedFile: {name: string, id: string, location: string}[] = [];
                    for(const [fileName, buffer] of chunksByFile){
                        const {Location, Key} = await uploaderService.uploadFile(fileName, buffer);
                        uploadedFile.push({name: fileName, id: Key, location: Location});
                    }

                    if(uploadedFile.length === 0){
                        throw new Error('Error upload file');
                    }

                    res.writeStatus("200 OK");
                    this.addCorsHeaders(res);
                    return res.end(JSON.stringify(uploadedFile));
                }catch(err){
                    console.error("An error happened", err)
                    res.writeStatus("500 Internal Server Error");
                    this.addCorsHeaders(res);
                    return res.end('An error happened');
                }
            })();
        });
    }

    deleteUploadedFile(){
        this.App.options("/upload-file/:fileId", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);
            res.end();
        });

        this.App.del("/upload-file/:fileId", (res: HttpResponse, req: HttpRequest) => {
            (async () => {
                res.onAborted(() => {
                    console.warn('delete upload file request was aborted');
                });

                const fileId = decodeURI(req.getParameter(0));
                try{
                    await uploaderService.deleteFileById(fileId);
                    res.writeStatus("200 OK");
                    this.addCorsHeaders(res);
                    return res.end(JSON.stringify({message: "ok", id: fileId}));
                }catch(err){
                    console.error("deleteUploadedFile => An error happened", err)
                    res.writeStatus("500 Internal Server Error");
                    this.addCorsHeaders(res);
                    return res.end('An error happened');
                }
            })();
        });
    }
}
