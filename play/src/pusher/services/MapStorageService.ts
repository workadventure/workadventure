import axios, { AxiosInstance } from "axios";
import { INTERNAL_MAP_STORAGE_URL } from "../enums/EnvironmentVariable";

export class MapStorageService {
    private client: AxiosInstance;

    constructor() {
        // Create a new instance of axios with a custom config
        this.client = axios.create({
            baseURL: INTERNAL_MAP_STORAGE_URL,
        });
    }

    async getMapByTags(domain: string, tags?: string[]): Promise<unknown> {
        const response = await this.client.get(`${INTERNAL_MAP_STORAGE_URL}/maps/tags/${tags?.join(",")}`, {
            headers: {
                "X-Forwarded-Host": domain,
            },
        });
        return response.data;
    }
}
