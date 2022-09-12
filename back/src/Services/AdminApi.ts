import { ADMIN_API_TOKEN, ADMIN_API_URL } from "../Enum/EnvironmentVariable";
import Axios from "axios";
import { isMapDetailsData, MapDetailsData } from "../Messages/JsonMessages/MapDetailsData";
import { isRoomRedirect, RoomRedirect } from "../Messages/JsonMessages/RoomRedirect";

class AdminApi {
    async fetchMapDetails(playUri: string): Promise<MapDetailsData | RoomRedirect> {
        if (!ADMIN_API_URL) {
            return Promise.reject(new Error("No admin backoffice set!"));
        }

        const params: { playUri: string } = {
            playUri,
        };

        const res = await Axios.get(ADMIN_API_URL + "/api/map", {
            headers: { Authorization: `${ADMIN_API_TOKEN}`, "User-Agent": "Back" },
            params,
        });

        const mapDetailData = isMapDetailsData.safeParse(res.data);
        const roomRedirect = isRoomRedirect.safeParse(res.data);

        if (mapDetailData.success) {
            return mapDetailData.data;
        }

        if (roomRedirect.success) {
            return roomRedirect.data;
        }

        console.error(mapDetailData.error.issues);
        console.error(roomRedirect.error.issues);
        console.error("Unexpected answer from the /api/map admin endpoint.", res.data);
        throw new Error("Unexpected answer from the /api/map admin endpoint.");
    }
}

export const adminApi = new AdminApi();
