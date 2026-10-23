import path from "path";
import type { AreaDataProperty, EntityDataProperty } from "@workadventure/map-editor";
import { getUploadedFileFormat } from "@workadventure/map-editor";
import type { UploadFileMessage } from "@workadventure/messages";
import { UploadedFileKind } from "@workadventure/messages";
import { fileSystem } from "../fileSystem";
import { mapPathUsingDomainWithPrefix } from "./PathMapper";

/** The file the property uploaded to the map-storage, if any. Its kind follows from the property type. */
export function uploadedFile(
    property: AreaDataProperty | EntityDataProperty,
): { name: string | null | undefined; kind: UploadedFileKind } | undefined {
    switch (property.type) {
        case "openFile":
            return { name: property.name, kind: UploadedFileKind.Document };
        case "playAudio":
            return { name: property.audioName, kind: UploadedFileKind.Sound };
        default:
            return undefined;
    }
}

export class CustomFileService {
    private readonly hostname: string;

    constructor(hostname: string) {
        this.hostname = hostname;
    }

    public async uploadFile(uploadFileMessage: UploadFileMessage) {
        const { file } = uploadFileMessage;
        const { name: filename, ext: fileExtension } = path.parse(uploadFileMessage.name);

        const errorm = "File extension is not a supported format :" + fileExtension + uploadFileMessage.name;

        if (!fileExtension.match(fileUploadSupportedFormatForMapStorage)) {
            throw new Error(errorm);
        }

        const mapPath = this.getFilePath(filename, uploadFileMessage.propertyId, fileExtension);
        console.info("Uploading file to: ", mapPath);
        await fileSystem.writeByteArrayAsFile(mapPath, file);
    }

    public async deleteFile(property: AreaDataProperty | EntityDataProperty) {
        const file = uploadedFile(property);
        if (!file?.name) {
            throw new Error("Property is missing name. Can't find file to delete.");
        }
        await fileSystem.deleteFiles(this.getFilePath(file.name, property.id, file.kind));
    }

        const { name: filename, ext: fileExtension } = path.parse(property.name);

        await fileSystem.deleteFiles(this.getFilePath(filename, property.id, fileExtension));
        return;
    }

    private getFilePath(filename: string, propertyId: string, fileExtension: string): string {
        // The property id comes from the client (front-generated UUID). A separator in it would let the
        // normalized path climb out of this world's folder, into another world's files.
        if (/[/\\]/.test(propertyId)) {
            throw new Error(`Invalid property id: ${propertyId}`);
        }
        return mapPathUsingDomainWithPrefix(`/private/files/${filename}-${propertyId}${fileExtension}`, this.hostname);
    }
}
