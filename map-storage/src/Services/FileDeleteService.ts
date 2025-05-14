import path from "path";
import { DeleteFileMessage } from "@workadventure/messages";
import { fileSystem } from "../fileSystem";
import { mapPathUsingDomainWithPrefix } from "./PathMapper";

export class FileDeleteService {
    private readonly hostname: string;

    constructor(hostname: string) {
        this.hostname = hostname;
    }

    public async deleteFile(deleteFileMessage: DeleteFileMessage) {
        const { name: filename, ext: fileExtension } = path.parse(deleteFileMessage.name);

        const mapPath = mapPathUsingDomainWithPrefix(
            `/file/${filename}-${deleteFileMessage.propertyId}${fileExtension}`,
            this.hostname
        );

        console.log("filesystem", await fileSystem.listFiles(""));
        console.log("Deleting file to: ", deleteFileMessage.name);
        await fileSystem.deleteFiles(mapPath);
        return;
    }
}
