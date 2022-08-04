import AWS, {S3} from "aws-sdk";
import { ManagedUpload } from "aws-sdk/clients/s3";
import {v4} from "uuid";
import { createClient, commandOptions } from "redis";
import { mimeTypeManager } from "./MimeType";

class UploaderService{
    private s3: S3|null = null;
    //@ts-ignore
    private redisClient?;
    private uploadedFileBuffers?: Map<string, Buffer>;

    constructor(){
        //TODO create provider with interface injected in this constructor
        if(process.env.AWS_BUCKET != undefined && process.env.AWS_BUCKET != ""){
            // Set the region 
            AWS.config.update({
                accessKeyId: (process.env.AWS_ACCESS_KEY_ID as string),
                secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY as string),
                region: (process.env.AWS_DEFAULT_REGION as string)
            });

            // Create S3 service object
            this.s3 = new AWS.S3({apiVersion: '2006-03-01'});
        }else if(process.env.REDIS_HOST != undefined 
                    && process.env.REDIS_HOST != "" 
                    && process.env.REDIS_PORT != undefined 
                    && process.env.REDIS_PORT != ""){
            this.redisClient = createClient({
                url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
            });
            this.redisClient.on('error', (err: unknown) => console.error('Redis Client Error', err));
            this.redisClient.connect();
        }else{
            this.uploadedFileBuffers = new Map<string, Buffer>();
        }
    }

    async uploadFile(fileName: string, chunks: Buffer): Promise<ManagedUpload.SendData>{
        const tab = (fileName).split('.');
        const fileUuid = `${v4()}.${tab[tab.length -1]}`;
        if(this.s3 != undefined){
            let uploadParams: S3.Types.PutObjectRequest = {
                Bucket: `${(process.env.AWS_BUCKET as string)}`, 
                Key: fileUuid, 
                Body: chunks,
                ACL: 'public-read'
            };

            const mimeType = mimeTypeManager.getMimeTypeByFileName(fileName);
            if(mimeType !== false){
                uploadParams = {
                    ...uploadParams,
                    ContentType: mimeType,
                };
            }

            //upload file in data
            const uploadedFile = await this.s3.upload(uploadParams,  (err, data)  => {
                if (err || !data) {
                    throw err;
                }
                return data;
            }).promise();
            return {...uploadedFile, Key: fileUuid};
        }else{
            if(this.redisClient != undefined){
                await this.redisClient.set(fileUuid, chunks);
            }
            if(this.uploadedFileBuffers != undefined){
                this.uploadedFileBuffers?.set(fileUuid, chunks);
            }
            return new Promise((solve, rej) => {
                solve({ Key:fileUuid, 
                    Location: `${process.env.UPLOADER_URL}/upload-file/${fileUuid}`,
                    Bucket: "",
                    ETag: ""
                });
            });
        }
    }

    async deleteFileById(fileId: string){
        if(this.s3 != undefined){
            const deleteParams: S3.Types.DeleteObjectRequest = {
                Bucket: `${(process.env.AWS_BUCKET as string)}`,
                Key: fileId
            };
            await this.s3.deleteObject(deleteParams).promise();
        }

        if(this.redisClient != undefined){
            await this.redisClient.del(fileId)
        }

        if(this.uploadedFileBuffers != undefined){
            this.uploadedFileBuffers?.delete(fileId);
        }
    }

    async get(fileId: string): Promise<Buffer|undefined>{
        if(this.redisClient != undefined){
            //@ts-ignore
            return await this.redisClient?.get(commandOptions({ returnBuffers: true }), fileId);
        }

        if(this.uploadedFileBuffers != undefined){
            return new Promise((resolve, rej) => {
                resolve(this.uploadedFileBuffers?.get(fileId));
            });
        }

        throw "Uploader cannot get data";
    }
}

export const uploaderService = new UploaderService();