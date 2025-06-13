import path from "path";
import { AreaDataProperty, fileUploadSupportedFormatForMapStorage } from "@workadventure/map-editor";
import { UploadFileMessage } from "@workadventure/messages";
import { fileSystem } from "../fileSystem";
import { mapPathUsingDomainWithPrefix } from "./PathMapper";

export class CustomFileService {
    private readonly hostname: string;

    constructor(hostname: string) {
        this.hostname = hostname;
    }

    public async uploadFile(uploadFileMessage: UploadFileMessage) {
        const { file } = uploadFileMessage;
        const { name: filename, ext: fileExtension } = path.parse(uploadFileMessage.name);

        const errorm = "File extension is not a supported format pdf :" + fileExtension + uploadFileMessage.name;

        if (!fileExtension.match(fileUploadSupportedFormatForMapStorage)) {
            throw new Error(errorm);
        }

        const mapPath = mapPathUsingDomainWithPrefix(
            `/file/${filename}-${uploadFileMessage.propertyId}${fileExtension}`,
            this.hostname
        );
        console.log("Uploading file to: ", mapPath);
        await fileSystem.writeByteArrayAsFile(mapPath, file);
        return;
    }

    public async deleteFile(property: AreaDataProperty) {
        if (property.type !== "openPdf") {
            throw new Error("Property is not a file");
        }

        if (!property.name) {
            throw new Error("Property is missing name. Can't find file to delete.");
        }

        const { name: filename, ext: fileExtension } = path.parse(property.name);

        const mapPath = mapPathUsingDomainWithPrefix(`/file/${filename}-${property.id}${fileExtension}`, this.hostname);

        await fileSystem.deleteFiles(mapPath);
        return;
    }
}
