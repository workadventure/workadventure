import axios, { isAxiosError } from "axios";
import {
    isMapDetailsData,
    MapDetailsData,
    isRoomRedirect,
    RoomRedirect,
    isErrorApiErrorData,
    ErrorApiData,
} from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { ADMIN_API_TOKEN, ADMIN_API_URL } from "../Enum/EnvironmentVariable";
import { LivekitCredentialsResponse } from "./Repository/LivekitCredentialsResponse";

class AdminApi {
    async fetchLivekitCredentials(spaceId: string, playUri: string): Promise<LivekitCredentialsResponse> {
        if (!ADMIN_API_URL) {
            return Promise.reject(new Error("No admin backoffice set!"));
        }

        const params: { playUri: string } = {
            playUri,
        };

        const res = await axios.get(new URL("api/livekit/credentials", ADMIN_API_URL).toString(), {
            headers: {
                Authorization: `${ADMIN_API_TOKEN ?? ""}`,
                Accept: "application/json",
            },
            params,
        });

        return LivekitCredentialsResponse.parse(res.data);
    }
    async fetchMapDetails(playUri: string): Promise<MapDetailsData | RoomRedirect | ErrorApiData> {
        if (!ADMIN_API_URL) {
            return Promise.reject(new Error("No admin backoffice set!"));
        }

        const params: { playUri: string } = {
            playUri,
        };

        try {
            const res = await axios.get(new URL("api/map", ADMIN_API_URL).toString(), {
                headers: {
                    Authorization: `${ADMIN_API_TOKEN ?? ""}`,
                    Accept: "application/json",
                },
                params,
            });

            const mapDetailData = isMapDetailsData.safeParse(res.data);

            if (mapDetailData.success) {
                return mapDetailData.data;
            }

            const roomRedirect = isRoomRedirect.safeParse(res.data);
            if (roomRedirect.success) {
                return roomRedirect.data;
            }

            const errorData = isErrorApiErrorData.safeParse(res.data);
            if (errorData.success) {
                return errorData.data;
            }

            console.error(
                "Invalid answer received from the admin for the /api/map endpoint. Errors:",
                mapDetailData.error.issues
            );
            Sentry.captureException(mapDetailData.error.issues);
            console.error(roomRedirect.error.issues);
            return {
                status: "error",
                type: "error",
                title: "Invalid server response",
                subtitle: "Something wrong happened while fetching map details!",
                image: "",
                code: "MAP_VALIDATION",
                details: "The server answered with an invalid response. The administrator has been notified.",
            };
        } catch (err) {
            let message = "Unknown error";
            if (isAxiosError(err)) {
                Sentry.captureException(
                    `An error occurred during call to /api/map endpoint. HTTP Status: ${err.status ?? "none"}. ${
                        err.message
                    }`
                );
                console.error(
                    `An error occurred during call to /api/map endpoint. HTTP Status: ${err.status ?? "none"}.`,
                    err
                );
            } else {
                Sentry.captureException(`An error occurred during call to /api/map endpoint.`);
                console.error(`An error occurred during call to /api/map endpoint.`, err);
            }
            if (err instanceof Error) {
                message = err.message;
            }
            return {
                status: "error",
                type: "error",
                title: "Connection error",
                subtitle: "Something wrong happened while fetching map details!",
                image: "",
                code: "ROOM_ACCESS_ERROR",
                details: message,
            };
        }
    }
}

export const adminApi = new AdminApi();
