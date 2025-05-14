import { Express } from "express";
import { CustomFileService } from "../Services/CustomFileService";

export class CustomFileController {
    private customFileService: CustomFileService;

    constructor(private app: Express) {
        this.customFileService = new CustomFileService("hostname i don't know where to get");
        this.postUploadFile();
        this.patchFile();
        this.deleteFile();
    }

    public postUploadFile() {
        this.app.post("/uploadNewFile", (req, res) => {
            console.log("Received file upload request", req);
            // upload file
            //this.customFileService.uploadFile(hostname);
        });
    }

    public patchFile() {
        this.app.patch("/replaceFile", (req, res) => {
            console.log("Received file update request", req);
            // delete file and upload new file
            //this.customFileService.deleteFile()
            //this.customFileService.uploadFile()
        });
    }

    public deleteFile() {
        this.app.delete("/deleteFile", (req, res) => {
            console.log("Received file delete request", req);
            // delete file
            //this.customFileService.deleteFile()
        });
    }
}
