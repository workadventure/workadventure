import AWS, {S3} from "aws-sdk";
import { ManagedUpload } from "aws-sdk/clients/s3";
import {v4} from "uuid";
import { createClient, commandOptions } from "redis";
import { mimeTypeManager } from "./MimeType";

class UploaderService{
    private s3: S3|null = null;
    //@ts-ignore
    private redisClient?;

    constructor(){
        //TODO create provider with interface injected in this constructor
        if(
            process.env.AWS_BUCKET != undefined && process.env.AWS_BUCKET != ""
            && process.env.AWS_ACCESS_KEY_ID != undefined && process.env.AWS_ACCESS_KEY_ID != ""
            && process.env.AWS_SECRET_ACCESS_KEY != undefined && process.env.AWS_SECRET_ACCESS_KEY != ""
            && process.env.AWS_DEFAULT_REGION != undefined && process.env.AWS_DEFAULT_REGION != ""
        ){
            // Set the region 
            AWS.config.update({
                accessKeyId: (process.env.AWS_ACCESS_KEY_ID),
                secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY),
                region: (process.env.AWS_DEFAULT_REGION)
            });

            // Create S3 service object
            this.s3 = new AWS.S3({apiVersion: '2006-03-01'});
        }

        if(
            process.env.REDIS_HOST != undefined 
            && process.env.REDIS_HOST != "" 
            && process.env.REDIS_PORT != undefined 
            && process.env.REDIS_PORT != ""
        ){
            this.redisClient = createClient({
                url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
            });
            this.redisClient.on('error', (err: unknown) => console.error('Redis Client Error', err));
            this.redisClient.connect();
        }
    }

    async uploadFile(fileName: string, chunks: Buffer, mimeType?: string): Promise<ManagedUpload.SendData>{
        const fileUuid = `${v4()}.${fileName.split('.').pop()}`;
        if(this.s3 != undefined){
            let uploadParams: S3.Types.PutObjectRequest = {
                Bucket: `${(process.env.AWS_BUCKET as string)}`, 
                Key: fileUuid, 
                Body: chunks,
                ACL: 'public-read'
            };

            if(mimeType !== undefined){
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
            if(this.redisClient == undefined){
                throw new Error("S3 and Redis for upload file are not defined");
            }
            await this.redisClient.set(fileUuid, chunks);
            return new Promise((solve, rej) => {
                solve({ Key:fileUuid, 
                    Location: `${process.env.UPLOADER_URL}/upload-file/${fileUuid}`,
                    Bucket: "",
                    ETag: ""
                });
            });
        }
    }

    uploadTempFile(audioMessageId: string, buffer: Buffer, expireSecond: number){
        if(this.redisClient == undefined){
            throw new Error("Redis is not defined");
        }
        return Promise.all([
            this.redisClient.set(audioMessageId, buffer),
            this.redisClient.expire(audioMessageId, expireSecond)
        ]);
    }

    async deleteFileById(fileId: string){
        if(this.s3 != undefined){
            const deleteParams: S3.Types.DeleteObjectRequest = {
                Bucket: `${(process.env.AWS_BUCKET as string)}`,
                Key: fileId
            };
            await this.s3.deleteObject(deleteParams).promise();
        }else{
            await this.redisClient?.del(fileId)
        }
    }

    get(fileId: string): Promise<Buffer|undefined>{
        if(this.redisClient == undefined){
            throw new Error("Redis is not defined");
        }
        //@ts-ignore
        return this.redisClient.get(commandOptions({ returnBuffers: true }), fileId);
    }

    getTemp(fileId: string){
        if(this.redisClient == undefined){
            throw new Error("Redis is not defined");
        }
        return this.redisClient.get(commandOptions({ returnBuffers: true }), fileId);
    }
}

export const uploaderService = new UploaderService();