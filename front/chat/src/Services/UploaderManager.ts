import {
    AWS_ACCESS_KEY_ID,
    AWS_BUCKET,
    AWS_DEFAULT_REGION,
    AWS_ENDPOINT,
    AWS_SECRET_ACCESS_KEY
} from "../Enum/EnvironmentVariable";
import {S3} from "aws-sdk";

export class UploaderManager{
    private client: S3 | undefined;

    private readonly bucketName = AWS_BUCKET ?? "";
    constructor() {
        if(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_DEFAULT_REGION && AWS_ENDPOINT && AWS_BUCKET){
            this.client = new S3({
                accessKeyId: AWS_ACCESS_KEY_ID,
                secretAccessKey: AWS_SECRET_ACCESS_KEY,
                region: AWS_DEFAULT_REGION,
                endpoint: AWS_ENDPOINT
            });
        }
    }

    private generateRandomString = () => {
        const chars =
            "AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz1234567890";
        const randomArray = Array.from(
            { length: 20 },
            () => chars[Math.floor(Math.random() * chars.length)]
        );
        return randomArray.join("");
    };

    private generateFileKey(file: File): string {
        const fileName = file.name.split('.');
        const ext = fileName.pop();
        return `${this.generateRandomString()}-${Date.now()}.${ext}`;
    }

    public async write(file: File): Promise<string|boolean> {
        const fileKey = this.generateFileKey(file);
        if (this.client) {
            const upload = this.client.putObject({
                Bucket: this.bucketName,
                Key: fileKey,
                Body: file,
                ContentType: file.type
            }).promise();
            return await upload.then(() => `${this.bucketName}/${fileKey}`).catch(() => false);
        } else {
            //TODO Save file to local server if AWS is not configured
        }

        return `${this.bucketName}/${fileKey}`;
    }
}


export const uploaderManager = new UploaderManager();
