import axios from "axios";
import { ADMIN_API_TOKEN, ADMIN_API_URL } from "../Enum/EnvironmentVariable";
import { isWokaList, WokaList } from "../Enum/PlayerTextures";
import { WokaServiceInterface } from "./WokaServiceInterface";

class AdminWokaService implements WokaServiceInterface {
    /**
     * Returns the list of all available Wokas for the current user.
     */
    getWokaList(roomId: string, token: string): Promise<WokaList | undefined> {
        return axios
            .get(`${ADMIN_API_URL}/api/woka/list/${roomId}/${token}`, {
                headers: { Authorization: `${ADMIN_API_TOKEN}` },
            })
            .then((res) => {
                if (isWokaList(res.data)) {
                    throw new Error("Bad response format provided by woka list endpoint");
                }
                return res.data;
            })
            .catch((err) => {
                console.error(`Cannot get woka list from admin API with token: ${token}`, err);
                return undefined;
            });
    }
}

export const adminWokaService = new AdminWokaService();
