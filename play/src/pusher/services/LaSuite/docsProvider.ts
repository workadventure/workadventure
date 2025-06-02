import axios, { AxiosInstance } from "axios";
import { LASUITE_DOCS_API_URI, LASUITE_DOCS_ADMIN_ACCESS_TOKEN } from "../../enums/EnvironmentVariable";

class LaSuiteDocsProvider {
    constructor() {}

    private getAxios(): AxiosInstance {
        return axios.create({
            baseURL: LASUITE_DOCS_API_URI,
            headers: {
                Authorization: `Token ${LASUITE_DOCS_ADMIN_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
        });
    }

    public async createDocument(): Promise<string> {
        try {
            const axiosInstance = this.getAxios();
            const response = await axiosInstance.post(`${LASUITE_DOCS_API_URI}/documents`);

            if (response.status === 200) {
                return response.data.result.id;
            } else {
                throw new Error("Failed to create document with status " + response.status);
            }
        } catch (error) {
            throw new Error("Failed to create document with status " + error);
        }
    }

    public async deleteDocument(laSuiteDocsId: string): Promise<void> {
        try {
            const axiosInstance = this.getAxios();
            const response = await axiosInstance.delete(`${LASUITE_DOCS_API_URI}/documents/${laSuiteDocsId}`);

            if (response.status === 200) {
                return;
            } else {
                throw new Error("Failed to delete document with status " + response.status);
            }
        } catch (error) {
            throw new Error("Failed to delete document with status " + error);
        }
    }
}

export const laSuiteDocsProvider = new LaSuiteDocsProvider();
