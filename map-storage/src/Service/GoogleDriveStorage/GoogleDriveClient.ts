import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

export class GoogleDriveClient {
    private drive: drive_v3.Drive;

    constructor(serviceAccountKey: string) {
        const jwtClient = new google.auth.JWT(
            serviceAccountKey,
            undefined,
            undefined,
            ['https://www.googleapis.com/auth/drive']
        );

        this.drive = google.drive({ version: 'v3', auth: jwtClient });
    }

    async uploadFile(fileName: string, mimeType: string, content: Readable, parentFolderId: string): Promise<string> {
        const res = await this.drive.files.create({
            requestBody: {
                name: fileName,
                mimeType: mimeType,
                parents: [parentFolderId],
            },
            media: {
                mimeType: mimeType,
                body: content,
            },
        });
        return res.data.id!;
    }

    async getFile(fileId: string): Promise<Readable> {
        const res = await this.drive.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'stream' }
        );
        return res.data as Readable;
    }

    async deleteFile(fileId: string): Promise<void> {
        await this.drive.files.delete({ fileId: fileId });
    }

    async listFiles(folderId: string): Promise<drive_v3.Schema$File[]> {
        const res = await this.drive.files.list({
            q: `'${folderId}' in parents`,
            fields: 'files(id, name)',
        });
        return res.data.files || [];
    }
}
