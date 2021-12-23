import { ADMIN_API_TOKEN, ADMIN_API_URL } from "../Enum/EnvironmentVariable";
import Axios from "axios";
import { isMapDetailsData, MapDetailsData } from "./AdminApi/MapDetailsData";
import { isRoomRedirect, RoomRedirect } from "./AdminApi/RoomRedirect";

class AdminApi {
    async fetchMapDetails(playUri: string): Promise<MapDetailsData | RoomRedirect> {
        if (!ADMIN_API_URL) {
            return Promise.reject(new Error("No admin backoffice set!"));
        }

        const params: { playUri: string } = {
            playUri,
        };

        const res = await Axios.get(ADMIN_API_URL + "/api/map", {
            headers: { Authorization: `${ADMIN_API_TOKEN}` },
            params,
        });

        if (!isMapDetailsData(res.data) && !isRoomRedirect(res.data)) {
            console.error("Unexpected answer from the /api/map admin endpoint.", res.data);
            throw new Error("Unexpected answer from the /api/map admin endpoint.");
        }

        return res.data;
    }
}

export const adminApi = new AdminApi();
