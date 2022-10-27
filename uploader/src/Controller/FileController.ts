import {App} from "../Server/sifrr.server";

import {v4} from "uuid";
import {HttpRequest, HttpResponse} from "uWebSockets.js";
import {Readable} from 'stream'
import {uploaderService} from "../Service/UploaderService";
import {ByteLenghtBufferException} from "../Exception/ByteLenghtBufferException";
import Axios, {AxiosError} from "axios";
import {ADMIN_API_URL, ENABLE_CHAT_UPLOAD, UPLOAD_MAX_FILESIZE, UPLOADER_URL} from "../Enum/EnvironmentVariable";
import {HttpResponseDevice} from "./HttpResponseDevice";
import {addCorsHeaders} from "./addCorsHeaders";

interface UploadedFileBuffer {
    buffer: Buffer,
    expireDate?: Date
}

class DisabledChat extends Error{}
class NotLoggedUser extends Error {}

export class FileController {
    //TODO migrate in upload file service
    private uploadedFileBuffers: Map<string, UploadedFileBuffer> = new Map<string, UploadedFileBuffer>();

    constructor(private App : App) {
        this.App = App;

        this.uploadAudioMessage();
        this.downloadAudioMessage();
        this.downloadFile();
        this.uploadFile();
        this.deleteUploadedFile();
    }

    uploadAudioMessage(){
        this.App.options("/upload-audio-message", (res: HttpResponse, req: HttpRequest) => {
            addCorsHeaders(res);
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
                    addCorsHeaders(res);
                    res.end(JSON.stringify({
                        id: audioMessageId,
                        path: `/download-audio-message/${audioMessageId}`
                    }));

                } catch (e) {
                    console.error("An error happened", e)
                    res.writeStatus("500 Internal Server Error");
                    addCorsHeaders(res);
                    res.end('An error happened');
                }
            })();
        });
    }

    downloadAudioMessage(){
        this.App.options("/download-audio-message/*", (res: HttpResponse, req: HttpRequest) => {
            addCorsHeaders(res);
            res.end();
        });

        this.App.get("/download-audio-message/:id", (res: HttpResponse, req: HttpRequest) => {
            res.onAborted(() => {
                console.warn('download-audio-message request was aborted');
            })
            const id = req.getParameter(0);
            const targetDevice = new HttpResponseDevice(id, res)
            uploaderService.copyFile(id, targetDevice)
        });
    }

    downloadFile(){
        this.App.options("/upload-file/*", (res: HttpResponse, req: HttpRequest) => {
            addCorsHeaders(res);
            res.end();
        });

        this.App.get("/upload-file/:id", (res: HttpResponse, req: HttpRequest) => {
            res.onAborted(() => {
                console.warn('download file request was aborted');
            })
            const id = req.getParameter(0);
            const targetDevice = new HttpResponseDevice(id, res)
            uploaderService.copyFile(id, targetDevice)
        })
    }

    uploadFile(){
        this.App.options("/upload-file", (res: HttpResponse, req: HttpRequest) => {
            addCorsHeaders(res);
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
                        onField: (fieldname: string, value: never) => {
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
                        const fileUuid = await uploaderService.uploadFile(
                            fileName,
                            buffer,
                            mimeType
                        );
                        const location = `${UPLOADER_URL}/upload-file/${fileUuid}`
                        uploadedFile.push({
                            name: fileName,
                            id: fileUuid,
                            location: location,
                            size: buffer.byteLength,
                            lastModified: new Date(),
                            type: mimeType
                        });
                    }

                    if(uploadedFile.length === 0){
                        throw new Error('Error upload file');
                    }

                    res.writeStatus("200 OK");
                    addCorsHeaders(res);
                    return res.end(JSON.stringify(uploadedFile));
                }catch(err){
                    console.error("FILE upload error", err);
                    if(err instanceof ByteLenghtBufferException){
                        res.writeStatus("413 Request Entity Too Large");
                        addCorsHeaders(res);
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
                            addCorsHeaders(res);
                            res.writeHeader('Content-Type', 'application/json');
                            return res.end(JSON.stringify({
                                message: err.response?.data?.message,
                                maxFileSize: err.response?.data.maxFileSize,
                            }));
                        }
                    } else if(err instanceof DisabledChat){
                        res.writeStatus("401 Unauthorized");
                        addCorsHeaders(res);
                        return res.end(JSON.stringify({message: 'disabled'}));
                    } else if(err instanceof NotLoggedUser){
                        res.writeStatus("401 Unauthorized");
                        addCorsHeaders(res);
                        return res.end(JSON.stringify({message: 'not-logged'}));
                    }
                    res.writeStatus("500 Internal Server Error");
                    addCorsHeaders(res);
                    return res.end('An error happened');
                }
            })();
        });
    }

    deleteUploadedFile(){
        this.App.options("/upload-file/:fileId", (res: HttpResponse, req: HttpRequest) => {
            addCorsHeaders(res);
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
                    addCorsHeaders(res);
                    return res.end(JSON.stringify({message: "ok", id: fileId}));
                }catch(err){
                    console.error("deleteUploadedFile => An error happened", err)
                    res.writeStatus("500 Internal Server Error");
                    addCorsHeaders(res);
                    return res.end('An error happened');
                }
            })();
        });
    }
}
