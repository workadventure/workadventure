import axios, { AxiosResponse } from "axios";
import { ADMIN_API_TOKEN, ADMIN_API_URL } from "../Enum/EnvironmentVariable";
import { wokaList, WokaList } from "../Enum/PlayerTextures";
import { WokaServiceInterface } from "./WokaServiceInterface";

class AdminWokaService implements WokaServiceInterface {
    /**
     * Returns the list of all available Wokas for the current user.
     */
    getWokaList(roomUrl: string, token: string): Promise<WokaList | undefined> {
        return axios
            .get<unknown, AxiosResponse<unknown>>(`${ADMIN_API_URL}/api/woka/list`, {
                headers: { Authorization: `${ADMIN_API_TOKEN}` },
                params: {
                    roomUrl,
                    uuid: token,
                },
            })
            .then((res) => {
                return wokaList.parse(res.data);
            })
            .catch((err) => {
                console.error(`Cannot get woka list from admin API with token: ${token}`, err);
                return undefined;
            });
    }
}

export const adminWokaService = new AdminWokaService();
