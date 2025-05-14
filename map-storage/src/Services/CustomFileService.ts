import path from "path";
import { AreaDataProperty, fileUploadSupportedFormatForMapStorage } from "@workadventure/map-editor";
import { fileSystem } from "../fileSystem";
import { mapPathUsingDomainWithPrefix } from "./PathMapper";

export class CustomFileService {
    private readonly hostname: string;

    constructor(hostname: string) {
        this.hostname = hostname;
    }

    public async uploadFile(property: AreaDataProperty) {
        if (property.type !== "openPdf") {
            throw new Error("Property is not a file");
        }

        if (!property.name || !property.file) {
            throw new Error("Property is missing name or file");
        }

        const { file } = property;
        const { name: filename, ext: fileExtension } = path.parse(property.name);

        const errorm = "File extension is not a supported format pdf :" + fileExtension + property.name;

        if (!fileExtension.match(fileUploadSupportedFormatForMapStorage)) {
            throw new Error(errorm);
        }

        const mapPath = mapPathUsingDomainWithPrefix(`/file/${filename}-${property.id}${fileExtension}`, this.hostname);

        if (!(file instanceof Uint8Array)) {
            throw new Error("File must be of type Uint8Array");
        }

        console.log("Uploading file to: ", mapPath);
        await fileSystem.writeByteArrayAsFile(mapPath, file);
        return;
    }

    public deleteFile(property: AreaDataProperty) {
        if (property.type !== "openPdf") {
            throw new Error("Property is not a file");
        }
        console.log("filesystem");
        //const { name: filename, ext: fileExtension } = path.parse(property.id);

        // const mapPath = mapPathUsingDomainWithPrefix(
        //     `/file/${filename}-${deleteFileMessage.propertyId}${fileExtension}`,
        //     this.hostname
        // );

        // console.log("Deleting file to: ", deleteFileMessage.name);
        // await fileSystem.deleteFiles(mapPath);
        return;
    }
}
