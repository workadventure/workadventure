import AWS, {S3} from "aws-sdk";
import { ManagedUpload } from "aws-sdk/clients/s3";
import {v4} from "uuid";
import { createClient, commandOptions } from "redis";
import {
    AWS_ACCESS_KEY_ID,
    AWS_BUCKET,
    AWS_DEFAULT_REGION,
    AWS_SECRET_ACCESS_KEY,
    AWS_URL, REDIS_HOST,
    REDIS_PORT,
    REDIS_DB_NUMBER,
    UPLOADER_URL, AWS_ENDPOINT
} from "../Enum/EnvironmentVariable";

class UploaderService{
    private s3: S3|null = null;
    //@ts-ignore
    private redisClient?;

    constructor(){
        //TODO create provider with interface injected in this constructor
        if(
            AWS_BUCKET != undefined && AWS_BUCKET != ""
            && AWS_ACCESS_KEY_ID != undefined && AWS_ACCESS_KEY_ID != ""
            && AWS_SECRET_ACCESS_KEY != undefined && AWS_SECRET_ACCESS_KEY != ""
            && AWS_DEFAULT_REGION != undefined && AWS_DEFAULT_REGION != ""
            && AWS_ENDPOINT != undefined && AWS_ENDPOINT != ""
        ){
            console.log('AWS_config :', AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION, AWS_ENDPOINT);
            // Set the region
            AWS.config.update({
                accessKeyId: (AWS_ACCESS_KEY_ID),
                secretAccessKey: (AWS_SECRET_ACCESS_KEY),
                region: (AWS_DEFAULT_REGION)
            });

            // Create S3 service object
            this.s3 = new AWS.S3({apiVersion: '2006-03-01', endpoint: AWS_ENDPOINT, s3ForcePathStyle: true});
        }

        if(
            REDIS_HOST != undefined
            && REDIS_HOST != ""
            && REDIS_PORT != undefined
            && REDIS_PORT != ""
        ){
            this.redisClient = createClient({
                url: `redis://${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB_NUMBER || 0}`,
            });
            this.redisClient.on('error', (err: unknown) => console.error('Redis Client Error', err));
            this.redisClient.connect();
        }
    }

    async uploadFile(fileName: string, chunks: Buffer, mimeType?: string): Promise<ManagedUpload.SendData>{
        const fileUuid = `${v4()}.${fileName.split('.').pop()}`;
        if(this.s3 instanceof S3){
            let uploadParams: S3.Types.PutObjectRequest = {
                Bucket: `${(AWS_BUCKET as string)}`,
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
                    Location: `${UPLOADER_URL}/upload-file/${fileUuid}`,
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
                Bucket: `${(AWS_BUCKET as string)}`,
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
