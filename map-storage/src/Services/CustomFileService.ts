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
        const { name, propertyId, kind, file } = uploadFileMessage;
        const mapPath = this.getFilePath(name, propertyId, kind);
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

    /**
     * A copied property still links to the file uploaded for the property it was copied from (files are named
     * after the property id). Gives it its own copy of that file, so that deleting or replacing one of them
     * leaves the other alone. Returns the link to the copy, or undefined if the property already owns its file.
     */
    public async copySharedFile(property: AreaDataProperty | EntityDataProperty): Promise<string | undefined> {
        const file = uploadedFile(property);
        const link =
            property.type === "openFile" ? property.link : property.type === "playAudio" ? property.audioLink : null;
        if (!file?.name || !link) {
            return undefined;
        }
        const { name, ext } = path.parse(file.name);
        const url = new URL(link);
        const linkedFileName = decodeURIComponent(path.posix.basename(url.pathname));
        if (!linkedFileName.startsWith(`${name}-`) || !linkedFileName.endsWith(ext)) {
            return undefined;
        }
        const linkedPropertyId = linkedFileName.slice(name.length + 1, linkedFileName.length - ext.length);
        if (linkedPropertyId === property.id) {
            return undefined;
        }
        await fileSystem.copy(
            this.getFilePath(file.name, linkedPropertyId, file.kind),
            this.getFilePath(file.name, property.id, file.kind),
        );
        url.pathname = path.posix.join(path.posix.dirname(url.pathname), `${name}-${property.id}${ext}`);
        return url.toString();
    }

    private getFilePath(fileName: string, propertyId: string, kind: UploadedFileKind): string {
        // The property id comes from the client (front-generated UUID). A separator in it would let the
        // normalized path climb out of this world's folder, into another world's files.
        if (/[/\\]/.test(propertyId)) {
            throw new Error(`Invalid property id: ${propertyId}`);
        }
        const format = getUploadedFileFormat(kind);
        const { name, ext } = path.parse(fileName);
        if (!format?.extensions.test(ext)) {
            throw new Error(`Unsupported file "${fileName}" for kind ${kind}`);
        }
        return mapPathUsingDomainWithPrefix(`/${format.folder}/${name}-${propertyId}${ext}`, this.hostname);
    }
}
