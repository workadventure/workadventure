import {v4} from "uuid";
//import {HttpRequest, HttpResponse} from "uWebSockets.js";
//import {Readable} from 'stream'
import {uploaderService} from "../Service/UploaderService";
import {ByteLenghtBufferException} from "../Exception/ByteLenghtBufferException";
import Axios, {AxiosError} from "axios";
import {ADMIN_API_URL, ENABLE_CHAT_UPLOAD, UPLOAD_MAX_FILESIZE, UPLOADER_URL} from "../Enum/EnvironmentVariable";
import {HttpResponseDevice} from "./HttpResponseDevice";
import {Server} from "hyper-express";
import {Request} from "hyper-express/types/components/http/Request";
import {Response} from "hyper-express/types/components/http/Response";

interface UploadedFileBuffer {
    buffer: Buffer,
    expireDate?: Date
}

class DisabledChat extends Error{}
class NotLoggedUser extends Error {}

export class FileController {
    //TODO migrate in upload file service
    private uploadedFileBuffers: Map<string, UploadedFileBuffer> = new Map<string, UploadedFileBuffer>();

    constructor(private App : Server) {
        this.App = App;

        this.uploadAudioMessage();
        this.downloadAudioMessage();
        this.downloadFile();
        this.uploadFile();
        this.deleteUploadedFile();
        this.ping();
    }

    uploadAudioMessage(){
        this.App.options("/upload-audio-message", (req: Request, res: Response) => {
            res.status(200).send("");
        });

        this.App.post("/upload-audio-message", async(request: Request, response: Response) => {
            const audioMessageId = v4();

            /*const chunks: Buffer[] = [];
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
            });*/

            const chunks: Buffer[] = [];

            await request.multipart(async (field) => {
                console.log('READING FILE', field.name);

                // Ensure that this field is a file-type
                // You may also perform your own checks on the encoding and mime type as needed
                if (field.file) {

                    // Let's upload everything in memory, in the buffer (not it might be more optimal to directly stream to the upload service in the future)
                    for await (const chunk of field.file.stream) {
                        if (!(chunk instanceof Buffer)) {
                            throw new Error('Unexpected chunk');
                        }
                        chunks.push(chunk);
                    }
                }
            });

            await uploaderService.uploadTempFile(
                audioMessageId,
                Buffer.concat(chunks),
                60
            );

            response.status(200).json({
                id: audioMessageId,
                path: `/download-audio-message/${audioMessageId}`
            });
        });
    }

    downloadAudioMessage(){
        this.App.options("/download-audio-message/*", (request: Request, response: Response) => {
            response.status(200).send("");
        });

        this.App.get("/download-audio-message/:id", (request: Request, response: Response) => {
            const id = request.path_parameters['id'];
            const targetDevice = new HttpResponseDevice(id, response);
            uploaderService.copyFile(id, targetDevice);
        });
    }

    downloadFile(){
        this.App.options("/upload-file/*", (request: Request, response: Response) => {
            response.status(200).send("");
        });

        this.App.get("/upload-file/:id", (request: Request, response: Response) => {
            const id = request.path_parameters["id"];
            const targetDevice = new HttpResponseDevice(id, response);
            uploaderService.copyFile(id, targetDevice);
        })
    }

    uploadFile(){
        this.App.options("/upload-file", (request: Request, response: Response) => {
            response.status(200).send("");
        });

        this.App.post("/upload-file", async (request: Request, response: Response) => {
            let userRoomToken = null;

            try {
                const chunksByFile = new Map<string, {
                    mimeType: string,
                    buffer: Buffer,
                }>();

                await request.multipart(async (field) => {
                    console.log('READING FILE', field.name, field.encoding, field.mime_type);
                    const chunks: Buffer[] = [];

                    // Ensure that this field is a file-type
                    if (field.file && field.file.name) {

                        // Let's upload everything in memory, in the buffer (note that it might be more optimal to directly stream to the upload service in the future)
                        for await (const chunk of field.file.stream) {
                            if (!(chunk instanceof Buffer)) {
                                throw new Error('Unexpected chunk');
                            }
                            chunks.push(chunk);
                        }
                        chunksByFile.set(field.file.name, {
                            mimeType: field.mime_type,
                            buffer: Buffer.concat(chunks)
                        });
                    }
                    if (field.name === 'userRoomToken') {
                        userRoomToken = field.value;
                    }
                });

                if(chunksByFile.size === 0){
                    throw new Error('no file found in request');
                }

                const uploadedFiles: {name: string, id: string, location: string, size: number, lastModified: Date, type?: string}[] = [];
                for(const [fileName, fileDesc] of chunksByFile){
                    const {buffer, mimeType} = fileDesc;
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
                    const fileUuid = await uploaderService.uploadFile(
                        fileName,
                        buffer,
                        mimeType
                    );
                    const location = `${UPLOADER_URL}/upload-file/${fileUuid}`
                    uploadedFiles.push({
                        name: fileName,
                        id: fileUuid,
                        location: location,
                        size: buffer.byteLength,
                        lastModified: new Date(),
                        type: mimeType
                    });
                }

                if(uploadedFiles.length === 0){
                    throw new Error('Error upload file');
                }

                response.status(200);
                return response.json(uploadedFiles);
            }catch(err){
                if(err instanceof ByteLenghtBufferException){
                    response.status(413);
                    return response.json({
                        message: err.message,
                        maxFileSize: UPLOAD_MAX_FILESIZE
                    });
                } else if(err instanceof AxiosError){
                    const status = err.response?.status;
                    if(status) {
                        if (status == 413) {
                            response.status(413);
                        } else if (status == 423) {
                            response.status(423);
                        } else {
                            response.status(401);
                        }
                        return response.json({
                            message: err.response?.data?.message,
                            maxFileSize: err.response?.data.maxFileSize,
                        });
                    }
                } else if(err instanceof DisabledChat){
                    response.status(401);
                    return response.json({message: 'disabled'});
                } else if(err instanceof NotLoggedUser){
                    response.status(401);
                    return response.json({message: 'not-logged'});
                }
                throw err;
            }

        });
    }

    deleteUploadedFile(){
        this.App.options("/upload-file/:fileId", (request: Request, response: Response) => {
            response.status(200).send("");
        });

        this.App.delete("/upload-file/:fileId", async (request: Request, response: Response) => {
            const fileId = decodeURI(request.path_parameters['fileId']);
            await uploaderService.deleteFileById(fileId);
            return response.json({message: "ok", id: fileId});
        });
    }

    ping(){
        this.App.get("/ping", (req: Request, res: Response) => {
            res.status(200).send("pong");
        });
    }
}
