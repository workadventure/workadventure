import {StorageProvider} from "./StorageProvider";
import {
    AWS_ACCESS_KEY_ID,
    AWS_BUCKET,
    AWS_DEFAULT_REGION,
    AWS_ENDPOINT,
    AWS_SECRET_ACCESS_KEY,
    UPLOADER_URL
} from "../Enum/EnvironmentVariable";
import AWS, {S3} from "aws-sdk";
import {CORSRules} from "aws-sdk/clients/s3";

export class S3StorageProvider implements StorageProvider {
    private s3: AWS.S3;

    static isEnabled():boolean {
        return !!AWS_BUCKET && !!AWS_ACCESS_KEY_ID && !!AWS_SECRET_ACCESS_KEY && !!AWS_DEFAULT_REGION
    }

    constructor() {
        // Set the region
        AWS.config.update({
            accessKeyId: (AWS_ACCESS_KEY_ID),
            secretAccessKey: (AWS_SECRET_ACCESS_KEY),
            region: (AWS_DEFAULT_REGION)
        });

        // Create S3 service object
        const options = {apiVersion: '2006-03-01', s3ForcePathStyle: true};
        if (AWS_ENDPOINT){
            // @ts-ignore
            options.endpoint = AWS_ENDPOINT
        }
        this.s3 = new AWS.S3(options);
        if (!AWS_BUCKET) throw new Error(`AWS_BUCKET must be set `)
        const bucket:string = AWS_BUCKET

        const corsRules:CORSRules = [
            {
                "AllowedHeaders": [ "Authorization" ],
                "AllowedMethods": [ "GET", "HEAD" ],
                // It must be a wildcard because file will be downloaded via redirect and origin is set to null
                "AllowedOrigins": [ "*" ],
                "ExposeHeaders": [ "Access-Control-Allow-Origin" ]
            }
        ]
        this.s3.putBucketCors({Bucket: bucket, CORSConfiguration: {CORSRules: corsRules}}, (err, _data)=> {
            if (err) {
                console.log("Could not setup CORS for S3 bucket", err);
                return
            }
        })
    }

    async upload(fileUuid: string, chunks: Buffer, mimeType:string|undefined) {
        let uploadParams: S3.Types.PutObjectRequest = {
            Bucket: `${(AWS_BUCKET as string)}`,
            Key: fileUuid,
            Body: chunks
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
        uploadedFile.Location=`${UPLOADER_URL}/external-upload-file/${fileUuid}`
        return {...uploadedFile, Key: fileUuid};
    }

    async deleteFileById(fileId: string): Promise<void> {
        const deleteParams: S3.Types.DeleteObjectRequest = {
            Bucket: `${(AWS_BUCKET as string)}`,
            Key: fileId
        };
        await this.s3.deleteObject(deleteParams).promise();
    }

    get(fileId: string): Promise<Buffer | undefined | null> {
        throw new Error(`S3 storage provider does not support get method`)
    }

    async getExternalDownloadLink(fileId: string): Promise<string> {
        const params = {Bucket: AWS_BUCKET, Key: fileId, Expires: 60};
        return await this.s3.getSignedUrlPromise('getObject', params);
    }
}
export const s3StorageProvider = S3StorageProvider.isEnabled()? new S3StorageProvider() : null;
