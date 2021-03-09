import {ADMIN_API_TOKEN, ADMIN_API_URL} from "../Enum/EnvironmentVariable";
import Axios from "axios";

export interface AdminApiData {
    organizationSlug: string
    worldSlug: string
    roomSlug: string
    mapUrlStart: string
    tags: string[]
    policy_type: number
    userUuid: string
    messages?: unknown[],
    textures: CharacterTexture[]
}

export interface CharacterTexture {
    id: number,
    level: number,
    url: string,
    rights: string
}

class AdminApi {

    async fetchMapDetails(organizationSlug: string, worldSlug: string, roomSlug: string|undefined): Promise<AdminApiData> {
        if (!ADMIN_API_URL) {
            return Promise.reject('No admin backoffice set!');
        }

        const params: { organizationSlug: string, worldSlug: string, roomSlug?: string } = {
            organizationSlug,
            worldSlug
        };

        if (roomSlug) {
            params.roomSlug = roomSlug;
        }

        const res = await Axios.get(ADMIN_API_URL + '/api/map',
            {
                headers: {"Authorization": `${ADMIN_API_TOKEN}`},
                params
            }
        )
        return res.data;
    }
}

export const adminApi = new AdminApi();
