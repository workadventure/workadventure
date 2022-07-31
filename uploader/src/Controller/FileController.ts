import {App} from "../Server/sifrr.server";

import {v4} from "uuid";
import {HttpRequest, HttpResponse} from "uWebSockets.js";
import {BaseController} from "./BaseController";
import {Readable} from 'stream'
import AWS, {S3} from "aws-sdk";

interface UploadedFileBuffer {
    buffer: Buffer,
    expireDate?: Date
}

export class FileController extends BaseController {
    private uploadedFileBuffers: Map<string, UploadedFileBuffer> = new Map<string, UploadedFileBuffer>();
    private s3: S3|null = null;

    constructor(private App : App) {
        super();
        this.App = App;
        this.uploadAudioMessage();
        this.downloadAudioMessage();
        this.uploadFile();

        // Cleanup every 1 minute
        setInterval(this.cleanup.bind(this), 60000);

        if(process.env.AWS_BUCKET != undefined && process.env.AWS_BUCKET != ""){
            // Set the region 
            AWS.config.update({
                accessKeyId: (process.env.AWS_ACCESS_KEY_ID as string),
                secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY as string),
                region: (process.env.AWS_DEFAULT_REGION as string)
            });

            // Create S3 service object
            this.s3 = new AWS.S3({apiVersion: '2006-03-01'});
        }
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
                    let fileName: string | null = null;
                    const chunks: Buffer[] = [];
                    const params = await res.formData({
                        onFile: (fieldname: string, file: NodeJS.ReadableStream, filename: string, encoding: string, mimetype: string) => {
                            fileName = filename;
                            (async () => {
                                console.log('READING FILE', filename, encoding, mimetype);
                                
                                for await (const chunk of file) {
                                    if (!(chunk instanceof Buffer)) {
                                        throw new Error('Unexpected chunk');
                                    }
                                    chunks.push(chunk)
                                }
                            })();
                        }
                    });

                    if(fileName == undefined){
                        throw new Error('no file name');
                    }
                    
                    let Location = null;
                    if(this.s3 != undefined){
                        const tab = (fileName as string).split('.');
                        const fileUuid = `${v4()}.${tab[tab.length -1]}`;
                        const uploadParams: S3.Types.PutObjectRequest = {
                            Bucket: `${(process.env.AWS_BUCKET as string)}`, 
                            Key: fileUuid, 
                            Body: Buffer.concat(chunks)
                        };

                        //upload file in data
                        const uploadedFile = await this.s3.upload(uploadParams,  (err, data)  => {
                            if (err || !data) {
                                throw err;
                            }
                            return data;
                        }).promise();
                        Location = uploadedFile.Location;
                    }else{
                        const audioMessageId = v4();
                        Location = `${process.env.UPLOADER_URL}/download-audio-message/${audioMessageId}`;
                        this.uploadedFileBuffers.set(audioMessageId, {
                            buffer: Buffer.concat(chunks),
                            expireDate: undefined
                        });
                    }

                    if(Location == undefined){
                        throw new Error('Error upload file');
                    }

                    res.writeStatus("200 OK");
                    this.addCorsHeaders(res);
                    return res.end(JSON.stringify({
                        message: "ok",
                        location: Location
                    }));
                }catch(err){
                    console.log("An error happened", err)
                    res.writeStatus(err.status || "500 Internal Server Error");
                    this.addCorsHeaders(res);
                    return res.end('An error happened');
                }
            })();
        });
    }
}
