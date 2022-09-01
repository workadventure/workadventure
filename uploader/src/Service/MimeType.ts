import mime from "mime-types";

class MimeTypeManager{
    getMimeTypeByFileName(name: string){
        const extension = name.split('.').pop();
        if(!extension){
            return false;
        }
        return mime.contentType(extension);
    }
}

export const mimeTypeManager = new MimeTypeManager();