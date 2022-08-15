import { uploaderManager } from "./UploaderManager";
import { filesUploadStore } from "../Stores/ChatStore";
import xml, { Element } from "@xmpp/xml";
import { get } from "svelte/store";

const _VERBOSE = true;

export enum uploadingState {
    inprogress = 1,
    finish,
    error,
}

export interface UploadedFileInterface {
    name: string;
    id: string;
    location: string;
    uploadState: uploadingState;
}

export class UploadedFile implements FileExt, UploadedFileInterface {
    public uploadState: uploadingState;
    public errorMessage?: string;
    constructor(
        public name: string,
        public id: string,
        public location: string,
        public lastModified: number,
        public webkitRelativePath: string,
        public size: number,
        public type: string
    ) {
        this.uploadState = uploadingState.finish;
    }

    arrayBuffer(): Promise<ArrayBuffer> {
        throw new Error("Method not implemented.");
    }
    slice(start?: number | undefined, end?: number | undefined, contentType?: string | undefined): Blob {
        throw new Error("Method not implemented.");
    }
    stream(): ReadableStream<Uint8Array> {
        throw new Error("Method not implemented.");
    }
    text(): Promise<string> {
        throw new Error("Method not implemented.");
    }

    get isImage() {
        if (!this.extension) {
            return false;
        }
        return FileMessageManager.isImage(this.extension);
    }
    get isVideo() {
        if (!this.extension) {
            return false;
        }
        return FileMessageManager.isVideo(this.extension);
    }
    get isSound() {
        if (!this.extension) {
            return false;
        }
        return FileMessageManager.isSound(this.extension);
    }
    get extension() {
        if (this.location == undefined) {
            return undefined;
        }
        return FileMessageManager.getExtension(this.location);
    }
}

export interface FileExt extends File {
    uploadState: uploadingState;
    errorMessage?: string;
}

export class FileMessageManager {
    //upload and send files messages
    async sendFiles(files: FileList) {
        //initialise file in the state of uploded file
        filesUploadStore.update((list) => {
            for (const file of files) {
                const fileExt = file as FileExt;
                fileExt.uploadState = uploadingState.inprogress;
                list.set(file.name, fileExt);
            }
            return list;
        });

        if (_VERBOSE) console.warn("[XMPP]", "File uploaded");

        try {
            const results = await uploaderManager.write(files);

            //update state of message
            filesUploadStore.update((list) => {
                for (const result of results) {
                    list.set(result.name, result);
                }
                return list;
            });
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error("sendFiles => ", err, err.response);

            //add error state in message
            filesUploadStore.update((list) => {
                for (const [, file] of list) {
                    file.uploadState = uploadingState.error;
                    file.errorMessage = err.response?.data?.message;
                    list.set(file.name, file);
                }
                return list;
            });
        }
    }

    async deleteFile(file: UploadedFile) {
        if (_VERBOSE) console.warn("[XMPP]", "File uploaded");
        return uploaderManager.delete(file.id);
    }

    /**
     *
     * @param files
     * @returns
     */
    get getXmlFileAttr() {
        return this.getXmlFileAttrFrom(this.files);
    }

    /**
     *
     * @param files
     * @returns
     */
    public getXmlFileAttrFrom(files: UploadedFile[]) {
        return files.reduce((xmlObject, file) => {
            xmlObject.append(xml("file", { ...file }));
            return xmlObject;
        }, xml("files", { size: files.length }));
    }

    public getFilesListFromXml(xmlFile: Element) {
        return xmlFile.getChildElements().reduce((list: UploadedFile[], element: Element) => {
            const file = new UploadedFile(
                element.getAttr("name") as string,
                element.getAttr("id") as string,
                element.getAttr("location") as string,
                element.getAttr("lastModified") as number,
                element.getAttr("webkitRelativePath") as string,
                element.getAttr("size") as number,
                element.getAttr("type") as string
            );
            list.push(file);
            return list;
        }, []);
    }

    get files(): UploadedFile[] {
        return [...get(filesUploadStore).values()] as UploadedFile[];
    }

    public reset() {
        filesUploadStore.set(new Map());
    }

    public static isImage(extension: string) {
        return ["png", "jpef", "gif", "svg"].includes(extension);
    }
    public static isVideo(extension: string) {
        return ["mov", "mp4", "m4v", "avi", "mov", "ogg", "webm"].includes(extension);
    }
    public static isSound(extension: string) {
        return ["mp3", "wav"].includes(extension);
    }
    public static getExtension(location: string) {
        return location.split(".").pop()?.toLowerCase();
    }
}

export const fileMessageManager = new FileMessageManager();
