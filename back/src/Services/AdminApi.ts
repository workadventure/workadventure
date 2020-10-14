import {ADMIN_API_TOKEN, ADMIN_API_URL} from "../Enum/EnvironmentVariable";
import Axios from "axios";
import {RoomIdentifier} from "../Model/RoomIdentifier";

export interface AdminApiData {
    organizationSlug: string
    worldSlug: string
    roomSlug: string
    mapUrlStart: string
    userUuid: string
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

    async memberIsGrantedAccessToRoom(memberId: string, roomIdentifier: RoomIdentifier): Promise<boolean> {
        if (!ADMIN_API_URL) {
            return Promise.reject('No admin backoffice set!');
        }
        try {
            const res = await Axios.get(ADMIN_API_URL+'/api/member/is-granted-access',
                { headers: {"Authorization" : `${ADMIN_API_TOKEN}`}, params: {memberId, organizationSlug: roomIdentifier.organizationSlug, worldSlug: roomIdentifier.worldSlug, roomSlug: roomIdentifier.roomSlug} }
            )
            return !!res.data;
        } catch (e) {
            console.log(e.message)
            return false;
        }
    }
}

export const adminApi = new AdminApi();
