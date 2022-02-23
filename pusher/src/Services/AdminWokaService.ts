import axios from "axios";
import { ADMIN_API_TOKEN, ADMIN_API_URL } from "../Enum/EnvironmentVariable";
import { isWokaList, WokaList } from "../Enum/PlayerTextures";
import { WokaServiceInterface } from "./WokaServiceInterface";

class AdminWokaService implements WokaServiceInterface {
    /**
     * Returns the list of all available Wokas for the current user.
     */
    getWokaList(token: string): Promise<WokaList | undefined> {
        return axios
            .get(`${ADMIN_API_URL}/api/woka-list/${token}`, {
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

    /**
     * Returns the URL of all the images for the given texture ids.
     *
     * Key: texture id
     * Value: URL
     *
     * If one of the textures cannot be found, undefined is returned
     */
    /*fetchWokaDetails(textureIds: string[]): Promise<WokaDetailsResult | undefined> {
        return axios
            .post(
                `${ADMIN_API_URL}/api/woka-details`,
                {
                    textureIds,
                },
                {
                    headers: { Authorization: `${ADMIN_API_TOKEN}` },
                }
            )
            .then((res) => {
                if (isWokaDetailsResult(res.data)) {
                    throw new Error("Bad response format provided by woka detail endpoint");
                }

                const result: WokaDetailsResult = res.data;
                if (result.length !== textureIds.length) {
                    return undefined;
                }

                for (const detail of result) {
                    if (!detail.texture) {
                        return undefined;
                    }
                }

                return res.data;
            })
            .catch((err) => {
                console.error(`Cannot get woka details from admin API with ids: ${textureIds}`, err);
                return undefined;
            });
    }*/
}

export const adminWokaService = new AdminWokaService();
