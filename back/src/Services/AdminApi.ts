import {ADMIN_API_TOKEN, ADMIN_API_URL} from "../Enum/EnvironmentVariable";
import Axios from "axios";


class AdminApi {

    fetchVisitCardUrl(membershipUuid: string): Promise<string> {
        if (ADMIN_API_URL) {
            return Axios.get(ADMIN_API_URL + '/api/membership/'+membershipUuid,
                {headers: {"Authorization": `${ADMIN_API_TOKEN}`}}
            ).then((res) => {
                return res.data;
            }).catch(() => {
                return 'INVALID';
            });
        } else {
            return Promise.resolve('INVALID')
        }
    }
}

export const adminApi = new AdminApi();
