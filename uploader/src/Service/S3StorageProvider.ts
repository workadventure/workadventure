import AWS, {S3} from "aws-sdk";
import {CORSRules} from "aws-sdk/clients/s3";
import {
    AWS_ACCESS_KEY_ID,
    AWS_BUCKET,
    AWS_DEFAULT_REGION,
    AWS_ENDPOINT,
    AWS_SECRET_ACCESS_KEY,
    UPLOADER_AWS_SIGNED_URL_EXPIRATION
} from "../Enum/EnvironmentVariable";
import {StorageProvider} from "./StorageProvider";
import {TargetDevice} from "./TargetDevice";

export class S3StorageProvider implements StorageProvider {
    private s3: AWS.S3 | undefined;

    static isEnabled():boolean {
        return !!AWS_BUCKET && !!AWS_ACCESS_KEY_ID && !!AWS_SECRET_ACCESS_KEY && !!AWS_DEFAULT_REGION
    }

    constructor() {
    }

    async upload(fileUuid: string, chunks: Buffer, mimeType:string|undefined): Promise<string> {
        let uploadParams: S3.Types.PutObjectRequest = {
            Bucket: `${AWS_BUCKET ?? ''}`,
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
        await this.S3().upload(uploadParams,  (err, data)  => {
            if (err || !data) {
                throw err;
            }
            return data;
        }).promise();
        return fileUuid
    }

    async deleteFileById(fileId: string): Promise<void> {
        const deleteParams: S3.Types.DeleteObjectRequest = {
            Bucket: `${AWS_BUCKET ?? ''}`,
            Key: fileId
        };
        await this.S3().deleteObject(deleteParams).promise();
    }

    copyFile(fileId: string, target: TargetDevice): void {
        this.getExternalDownloadLink(fileId).then(link => target.copyFromLink(link))
    }

    private async getExternalDownloadLink(fileId: string): Promise<string> {
        const params = {Bucket: AWS_BUCKET, Key: fileId, Expires: UPLOADER_AWS_SIGNED_URL_EXPIRATION};
        return await this.S3().getSignedUrlPromise('getObject', params);
    }

    private S3() {
        if (this.s3 === undefined) {
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
            if (!AWS_BUCKET) throw new Error(`AWS_BUCKET must be set `)
            this.s3 = new AWS.S3(options);
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
            console.log(options);
            this.s3.putBucketCors({Bucket: bucket, CORSConfiguration: {CORSRules: corsRules}}, (err, _data)=> {
                if (err) {
                    console.log("Could not setup CORS for S3 bucket", err);
                    return
                }
            })
        }
        return this.s3
    }
}
export const s3StorageProvider = S3StorageProvider.isEnabled()? new S3StorageProvider() : null;
