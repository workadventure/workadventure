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
}

export interface fetchMemberDataByUuidResponse {
    uuid: string;
    tags: string[];
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

        const res = await Axios.get(ADMIN_API_URL+'/api/map',
            {
                headers: {"Authorization" : `${ADMIN_API_TOKEN}`},
                params
            }
        )
        return res.data;
    }

    async fetchMemberDataByUuid(uuid: string): Promise<fetchMemberDataByUuidResponse> {
        if (!ADMIN_API_URL) {
            return Promise.reject('No admin backoffice set!');
        }
        const res = await Axios.get(ADMIN_API_URL+'/membership/'+uuid,
            { headers: {"Authorization" : `${ADMIN_API_TOKEN}`} }
        )
        return res.data;
    }
    
    async fetchMemberDataByToken(organizationMemberToken: string): Promise<AdminApiData> {
        if (!ADMIN_API_URL) {
            return Promise.reject('No admin backoffice set!');
        }
        //todo: this call can fail if the corresponding world is not activated or if the token is invalid. Handle that case.
        const res = await Axios.get(ADMIN_API_URL+'/api/login-url/'+organizationMemberToken,
            { headers: {"Authorization" : `${ADMIN_API_TOKEN}`} }
        )
        return res.data;
    }

    async fetchCheckUserByToken(organizationMemberToken: string): Promise<AdminApiData> {
        if (!ADMIN_API_URL) {
            return Promise.reject('No admin backoffice set!');
        }
        //todo: this call can fail if the corresponding world is not activated or if the token is invalid. Handle that case.
        const res = await Axios.get(ADMIN_API_URL+'/api/check-user/'+organizationMemberToken,
            { headers: {"Authorization" : `${ADMIN_API_TOKEN}`} }
        )
        return res.data;
    }
    
    reportPlayer(reportedUserUuid: string, reportedUserComment: string, reporterUserUuid: string) {
       return Axios.post(`${ADMIN_API_URL}/api/report`, {
                reportedUserUuid,
                reportedUserComment,
                reporterUserUuid,
            },
            {
                headers: {"Authorization": `${ADMIN_API_TOKEN}`}
            });
    }
}

export const adminApi = new AdminApi();
