import FormData from "form-data";
import axios from "axios";

export async function uploadFile(uploadUrl: string, fileList: {name: string, contents: string}[]) {
        const formData = new FormData();
        fileList.forEach(entry => {
            const fileBuffer = Buffer.from(entry.contents, "utf-8")
            formData.append('file', fileBuffer, entry.name);
        })

        return await axios.post(uploadUrl, formData.getBuffer(), {
            headers: formData.getHeaders()
        });
    }
