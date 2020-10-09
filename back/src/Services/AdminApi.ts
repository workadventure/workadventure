import {ADMIN_API_TOKEN, ADMIN_API_URL} from "../Enum/EnvironmentVariable";
import Axios, {AxiosError} from "axios";

export interface AdminApiData {
    organizationSlug: string
    worldSlug: string
    roomSlug: string
    mapUrlStart: string
    userUuid: string
}

class AdminApi {
    
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

    async memberIsGrantedAccessToRoom(memberId: string, roomId: string): Promise<boolean> {
        if (!ADMIN_API_URL) {
            return Promise.reject('No admin backoffice set!');
        }
        try {
            const res = await Axios.get(ADMIN_API_URL+'/api/member/is-granted-access',
                { headers: {"Authorization" : `${ADMIN_API_TOKEN}`}, params: {memberId, roomIdentifier: roomId} }
            )
            return !!res.data;
        } catch (e) {
            console.log(e.message)
            return false;
        }
    }
}

export const adminApi = new AdminApi();