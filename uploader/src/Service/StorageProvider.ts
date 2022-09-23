export interface StorageProvider {

    upload(fileUuid: string, chunks: Buffer, mimeType: string | undefined): Promise<Location>;

    deleteFileById(fileId: string): Promise<void>;

    get(fileId: string): Promise<Buffer | undefined | null>;

    getExternalDownloadLink(fileId: string): Promise<string>;
}

export interface Location {
    Location: string;
    Key: string;
}
