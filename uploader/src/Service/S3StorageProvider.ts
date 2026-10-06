import type {S3} from "aws-sdk";
import AWS from "aws-sdk";
import type {CORSRules} from "aws-sdk/clients/s3";
import {
    AWS_ACCESS_KEY_ID,
    AWS_BUCKET,
    AWS_DEFAULT_REGION,
    AWS_ENDPOINT,
    AWS_SECRET_ACCESS_KEY,
    UPLOADER_AWS_SIGNED_URL_EXPIRATION
} from "../Enum/EnvironmentVariable";
import {mimeTypeManager} from "./MimeType";
import type {StorageProvider} from "./StorageProvider";
import type {TargetDevice} from "./TargetDevice";

export class S3StorageProvider implements StorageProvider {
    private s3: AWS.S3 | undefined;

    static isEnabled():boolean {
        return !!AWS_BUCKET && !!AWS_ACCESS_KEY_ID && !!AWS_SECRET_ACCESS_KEY && !!AWS_DEFAULT_REGION
    }

    constructor() {
    }

    async upload(fileUuid: string, chunks: Buffer, mimeType:string|undefined): Promise<string> {
        // The content type is sent by the client along the file, so it is never stored as is:
        // an object stored as "text/html" would run script if it were ever served directly.
        const uploadParams: S3.Types.PutObjectRequest = {
            Bucket: `${AWS_BUCKET ?? ''}`,
            Key: fileUuid,
            Body: chunks,
            ContentType: mimeTypeManager.getSafeMimeType(mimeType),
            ContentDisposition: "attachment"
        };

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
        this.getExternalDownloadLink(fileId)
            .then(link => target.copyFromLink(link))
            .catch((err: unknown) => console.error("Could not copy file from S3", err))
    }

    private async getExternalDownloadLink(fileId: string): Promise<string> {
        // Download happens on the S3 origin, out of reach of our own headers, so the response
        // headers are overridden in the signed URL itself. This also neutralizes objects that
        // were stored with a dangerous content type before this was enforced on upload.
        const params = {
            Bucket: AWS_BUCKET,
            Key: fileId,
            Expires: UPLOADER_AWS_SIGNED_URL_EXPIRATION,
            ResponseContentType: mimeTypeManager.getSafeMimeTypeByFileName(fileId),
            ResponseContentDisposition: "attachment"
        };
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
            const options: S3.ClientConfiguration = {apiVersion: '2006-03-01', s3ForcePathStyle: true};
            if (AWS_ENDPOINT){
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
            this.s3.putBucketCors({Bucket: bucket, CORSConfiguration: {CORSRules: corsRules}})
                .promise()
                .catch((err: unknown) => console.log("Could not setup CORS for S3 bucket", err))
        }
        return this.s3
    }
}
export const s3StorageProvider = S3StorageProvider.isEnabled()? new S3StorageProvider() : null;
