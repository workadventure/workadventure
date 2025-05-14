import path from "path";
import { UploadFileMessage } from "@workadventure/messages";
import { fileUploadSupportedFormatForMapStorage } from "@workadventure/map-editor";
import { fileSystem } from "../fileSystem";
import { mapPathUsingDomainWithPrefix } from "./PathMapper";

export class FileUploadService {
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
        console.log("hostname", this.hostname);
        await fileSystem.writeByteArrayAsFile(mapPath, file);
        console.log("filesystem", await fileSystem.listFiles(""));
        return;
    }
}
