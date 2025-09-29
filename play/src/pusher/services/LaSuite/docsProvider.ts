import axios, { AxiosInstance } from "axios";
import { LASUITE_DOCS_BACKEND, LASUITE_DOCS_ADMIN_ACCESS_TOKEN, LASUITE_DOCS_FRONTEND } from "../../enums/EnvironmentVariable";
import { LaSuiteNumeriqueDocsPropertyData } from "../../../common/external-modules/lasuitenumerique-docs/MapEditor/types";

export enum LASUITE_NUMERIQUE_DOCS_VISIBILITY {
    PUBLIC = "public",
    AUTHENTICATED = "authenticated",
    RESTRICTED = "restricted",
}

export enum LASUITE_NUMERIQUE_DOCS_ROLE {
    EDITOR = "editor",
    READER = "reader",
}

const LASUITE_DOCS_API_URL = `${LASUITE_DOCS_BACKEND}/api/v1.0`;


class LaSuiteDocsProvider {
    constructor() {}

    private getAxios(): AxiosInstance {
        return axios.create({
            baseURL: LASUITE_DOCS_API_URL,
            headers: {
                Authorization: `Token ${LASUITE_DOCS_ADMIN_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
        });
    }

    public async createDocument(
        title: string = "new document"
        
    ): Promise<Pick<LaSuiteNumeriqueDocsPropertyData, "serverData">> {
        const axiosInstance = this.getAxios();
        const response = await axiosInstance.post(`${LASUITE_DOCS_API_URL}/documents/`, {
            title,
        });

        if (response.status === 201) {
            const documentId = response.data.id;
            const url = `${LASUITE_DOCS_FRONTEND}/docs/${documentId}`;
            return {
                serverData: {
                    url,
                    laSuiteNumeriqueDocsId: documentId,
                },
            };
        } else {
            throw new Error("Failed to create document with status " + response.status);
        }
    }

    public async deleteDocument(laSuiteNumeriqueDocsId: string): Promise<void> {
        try {
            const axiosInstance = this.getAxios();
            const response = await axiosInstance.delete(`${LASUITE_DOCS_API_URL}/documents/${laSuiteNumeriqueDocsId}/`);

            if (response.status === 200) {
                return;
            } else {
                throw new Error("Failed to delete document with status " + response.status);
            }
        } catch (error) {
            throw new Error("Failed to delete document with status " + error);
        }
    }

    public async changeDocumentVisibility(
        laSuiteNumeriqueDocsId: string,
        visibility: LASUITE_NUMERIQUE_DOCS_VISIBILITY,
        role: LASUITE_NUMERIQUE_DOCS_ROLE
    ): Promise<void> {
        const axiosInstance = this.getAxios();
        const response = await axiosInstance.put(
            `${LASUITE_DOCS_API_URL}/documents/${laSuiteNumeriqueDocsId}/link-configuration/`,
            {
                link_reach: visibility,
                link_role: role,
            }
        );
        if (response.status === 200) {
            return;
        } else {
            throw new Error("Failed to change document visibility with status " + response.status);
        }
    }
}

export const laSuiteDocsProvider = new LaSuiteDocsProvider();
