import Axios from "axios";
import { UPLOADER_URL } from "../Enum/EnvironmentVariable";

export interface FileExt extends File{
    isUploaded: boolean
}

export interface UploadedFileInterface{
    name: string, 
    id: string, 
    location: string,
    isUploaded: boolean
}

export class UploadedFile implements UploadedFileInterface{
    public isUploaded: boolean
    constructor(public name: string, public id: string, public location: string){
        this.isUploaded = true;
    }
}

export class UploaderManager{
    constructor() {
    }

    public async write(files: FileList): Promise<UploadedFile[]|false> {
        const formData = new FormData();
        for(const file of files){
            formData.append(file.name, file);
        }
        try{
            const result = await Axios.post(`${UPLOADER_URL}/upload-file`, formData);
            return result.data.reduce((list: UploadedFile[], file: UploadedFile) => {
                list.push(new UploadedFile(file.name, file.id, file.location));
                return list;
            }, []);
        }catch(err){
            //TODO manage error from uploader server
            console.error('Error push file', err);
            return false;
        }
    }

    public async delete(fileId: string) {
        try{
            await Axios.delete(`${UPLOADER_URL}/upload-file/${fileId}`);
        }catch(err){
            console.error('Delete uploaded file error: ', err);
        }
    }
}


export const uploaderManager = new UploaderManager();
