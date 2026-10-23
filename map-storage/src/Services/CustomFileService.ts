import path from "path";
import type { AreaDataProperty, EntityDataProperty } from "@workadventure/map-editor";
import { uploadedFileFolder } from "@workadventure/map-editor";
import type { UploadFileMessage } from "@workadventure/messages";
import { UploadedFileKind } from "@workadventure/messages";
import { fileSystem } from "../fileSystem";
import { mapPathUsingDomainWithPrefix } from "./PathMapper";

/** Name of the file the property uploaded to the map-storage, if any. */
export function uploadedFileName(property: AreaDataProperty | EntityDataProperty): string | null | undefined {
    switch (property.type) {
        case "openFile":
            return property.name;
        case "playAudio":
            return property.audioName;
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
        const mapPath = this.getFilePath(uploadFileMessage.name, uploadFileMessage.propertyId);
        console.info("Uploading file to: ", mapPath);
        await fileSystem.writeByteArrayAsFile(mapPath, uploadFileMessage.file);
    }

    public async deleteFile(property: AreaDataProperty | EntityDataProperty) {
        const name = uploadedFileName(property);
        if (!name) {
            throw new Error("Property is missing name. Can't find file to delete.");
        }
        await fileSystem.deleteFiles(this.getFilePath(name, property.id));
    }

    private getFilePath(fileName: string, propertyId: string): string {
        // The property id comes from the client (front-generated UUID). A separator in it would let the
        // normalized path climb out of this world's folder, into another world's files.
        if (/[/\\]/.test(propertyId)) {
            throw new Error(`Invalid property id: ${propertyId}`);
        }
        const { name, ext } = path.parse(fileName);
        const folder = uploadedFileFolder(ext);
        if (!folder) {
            throw new Error("File extension is not a supported format: " + fileName);
        }
        return mapPathUsingDomainWithPrefix(`/${folder}/${name}-${propertyId}${ext}`, this.hostname);
    }
}
