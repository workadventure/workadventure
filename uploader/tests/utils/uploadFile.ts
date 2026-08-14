import FormData from "form-data";
import type {AxiosRequestConfig} from "axios";
import axios from "axios";

export async function uploadFile<T = unknown>(uploadUrl: string, fileList: {name: string, contents: string}[], config: AxiosRequestConfig = {}) {
        const formData = new FormData();
        fileList.forEach(entry => {
            const fileBuffer = Buffer.from(entry.contents, "utf-8")
            formData.append('file', fileBuffer, entry.name);
        })

        return await axios.post<T>(uploadUrl, formData.getBuffer(), {
            ...config,
            headers: {...formData.getHeaders(), ...config.headers}
        });
    }
