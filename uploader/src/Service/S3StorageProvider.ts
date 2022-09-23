import {StorageProvider} from "./StorageProvider";
import {
    AWS_ACCESS_KEY_ID,
    AWS_BUCKET,
    AWS_DEFAULT_REGION,
    AWS_ENDPOINT,
    AWS_SECRET_ACCESS_KEY
} from "../Enum/EnvironmentVariable";
import AWS, {S3} from "aws-sdk";

export class S3StorageProvider implements StorageProvider {
    private s3: AWS.S3;

    static isEnabled():boolean {
        return !!AWS_BUCKET && !!AWS_ACCESS_KEY_ID && !!AWS_SECRET_ACCESS_KEY && !!AWS_DEFAULT_REGION
    }

    constructor() {
        console.log('AWS_config :', AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION, AWS_ENDPOINT);
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
    }

    async upload(fileUuid: string, chunks: Buffer, mimeType:string|undefined) {
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
}
export const s3StorageProvider = S3StorageProvider.isEnabled()? new S3StorageProvider() : null;
