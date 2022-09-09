import {App} from "../Server/sifrr.server";

import {v4} from "uuid";
import {HttpRequest, HttpResponse} from "uWebSockets.js";
import {BaseController} from "./BaseController";
import {Readable} from 'stream'
import { uploaderService } from "../Service/UploaderService";
import { mimeTypeManager } from "../Service/MimeType";
import { ByteLenghtBufferException } from "../Exception/ByteLenghtBufferException";
import Axios, {AxiosError} from "axios";
import {ADMIN_API_URL, ENABLE_CHAT_UPLOAD, UPLOAD_MAX_FILESIZE} from "../Enum/EnvironmentVariable";

interface UploadedFileBuffer {
    buffer: Buffer,
    expireDate?: Date
}

class DisabledChat extends Error{}
class NotLoggedUser extends Error {}

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

                    const chunks: Buffer[] = [];
                    const params = await res.formData({
                        onFile: (fieldname: string,
                                 file: NodeJS.ReadableStream,
                                 filename: string,
                                 encoding: string,
                                 mimetype: string) => {
                            (async () => {
                                console.log('READING FILE', fieldname)

                                for await (const chunk of file) {
                                    if (!(chunk instanceof Buffer)) {
                                        throw new Error('Unexpected chunk');
                                    }
                                    chunks.push(chunk)
                                }
                            })();
                        }
                    });

                    await uploaderService.uploadTempFile(
                        audioMessageId,
                        Buffer.concat(chunks),
                        60
                    );

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

            (async () => {
                res.onAborted(() => {
                    console.warn('download-audio-message request was aborted');
                })

                const id = req.getParameter(0);
                const buffer = await uploaderService.getTemp(id);
                if (buffer == undefined) {
                    res.writeStatus("404 Not found");
                    this.addCorsHeaders(res);
                    res.end("Cannot find file");
                    return;
                }

                const readable = new Readable()
                readable._read = () => {} // _read is required but you can noop it
                readable.push(buffer);
                readable.push(null);

                const size = buffer.byteLength;

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
            })();

        });
    }

    downloadFile(){
        this.App.options("/upload-file/*", (res: HttpResponse, req: HttpRequest) => {
            this.addCorsHeaders(res);
            res.end();
        });

        this.App.get("/upload-file/:id", (res: HttpResponse, req: HttpRequest) => {
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

                    this.addCorsHeaders(res);
                    res.writeStatus("200 OK");
                    //TODO manage type with the extension of file
                    const memeType = mimeTypeManager.getMimeTypeByFileName(id);
                    if(memeType !== false){
                        res.writeHeader("Content-Type", memeType);
                    }

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
                    console.error("downloadFile => An error happened", err);
                    this.addCorsHeaders(res);
                    res.writeStatus("500 Internal Server Error");
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
                });

                let userRoomToken = null;

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
                        },
                        onField: (fieldname: string, value: any) => {
                            if(fieldname === 'userRoomToken'){
                                userRoomToken = value;
                            }
                        }
                    });

                    if(params == undefined || chunksByFile.size === 0){
                        throw new Error('no file name');
                    }

                    const uploadedFile: {name: string, id: string, location: string, size: number, lastModified: Date, type?: string}[] = [];
                    for(const [fileName, buffer] of chunksByFile){
                        if(ADMIN_API_URL) {
                            if(!userRoomToken){
                                throw new NotLoggedUser();
                            } else {
                                await Axios.get(`${ADMIN_API_URL}/api/limit/fileSize`, {
                                    headers: {'userRoomToken': userRoomToken},
                                    params: {fileSize: buffer.byteLength}
                                });
                            }
                        } else {
                            console.log('FILE SIZE', fileName, ' : ', buffer.byteLength, 'bytes', '//', UPLOAD_MAX_FILESIZE, 'bytes');
                            if(!ENABLE_CHAT_UPLOAD){
                                throw new DisabledChat('Upload is disabled');
                            } else if (UPLOAD_MAX_FILESIZE && buffer.byteLength > parseInt(UPLOAD_MAX_FILESIZE)) {
                                throw new ByteLenghtBufferException(`file-too-big`);
                            }
                        }
                        const mimeType = params[fileName] ? params[fileName].mimetype : undefined;
                        const {Location, Key} = await uploaderService.uploadFile(
                            fileName,
                            buffer,
                            mimeType
                        );
                        uploadedFile.push({
                            name: fileName,
                            id: Key,
                            location: Location,
                            size: buffer.byteLength,
                            lastModified: new Date(),
                            type: mimeType
                        });
                    }

                    if(uploadedFile.length === 0){
                        throw new Error('Error upload file');
                    }

                    res.writeStatus("200 OK");
                    this.addCorsHeaders(res);
                    return res.end(JSON.stringify(uploadedFile));
                }catch(err){
                    console.error("FILE upload error", err);
                    if(err instanceof ByteLenghtBufferException){
                        res.writeStatus("413 Request Entity Too Large");
                        this.addCorsHeaders(res);
                        res.writeHeader('Content-Type', 'application/json');
                        return res.end(JSON.stringify({
                            message: err.message,
                            maxFileSize: UPLOAD_MAX_FILESIZE
                        }));
                    } else if(err instanceof AxiosError){
                        const status = err.response?.status;
                        if(status) {
                            if (status == 413) {
                                res.writeStatus("413 Request Entity Too Large");
                            } else if (status == 423) {
                                res.writeStatus("423 Locked");
                            } else {
                                res.writeStatus("401 Unauthorized");
                            }
                            this.addCorsHeaders(res);
                            res.writeHeader('Content-Type', 'application/json');
                            return res.end(JSON.stringify({
                                message: err.response?.data?.message,
                                maxFileSize: err.response?.data.maxFileSize,
                            }));
                        }
                    } else if(err instanceof DisabledChat){
                        res.writeStatus("401 Unauthorized");
                        this.addCorsHeaders(res);
                        return res.end(JSON.stringify({message: 'disabled'}));
                    } else if(err instanceof NotLoggedUser){
                        res.writeStatus("401 Unauthorized");
                        this.addCorsHeaders(res);
                        return res.end(JSON.stringify({message: 'not-logged'}));
                    }
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
