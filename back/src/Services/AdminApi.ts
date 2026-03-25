import type { MapDetailsData, RoomRedirect, ErrorApiData } from "@workadventure/messages";
import { isMapDetailsData, isRoomRedirect, isErrorApiErrorData } from "@workadventure/messages";
import { assertResponseOk, HttpError } from "@workadventure/shared-utils";
import * as Sentry from "@sentry/node";
import { ADMIN_API_TOKEN, ADMIN_API_URL } from "../Enum/EnvironmentVariable";
import { LivekitCredentialsResponse } from "./Repository/LivekitCredentialsResponse";

export class AdminApi {
    constructor(
        private readonly adminApiUrl: string | undefined = ADMIN_API_URL,
        private readonly adminApiToken: string | undefined = ADMIN_API_TOKEN
    ) {}

    private getRequestHeaders(): HeadersInit {
        return {
            Authorization: `${this.adminApiToken ?? ""}`,
            Accept: "application/json",
        };
    }

    async fetchLivekitCredentials(spaceId: string, playUri: string): Promise<LivekitCredentialsResponse> {
        if (!this.adminApiUrl) {
            return Promise.reject(new Error("No admin backoffice set!"));
        }

        const params: { playUri: string } = {
            playUri,
        };
        const url = new URL("api/livekit/credentials", this.adminApiUrl);
        url.searchParams.set("playUri", params.playUri);

        const res = await assertResponseOk(
            await fetch(url, {
                headers: this.getRequestHeaders(),
            })
        );

        return LivekitCredentialsResponse.parse((await res.json()) as unknown);
    }

    async fetchMapDetails(playUri: string): Promise<MapDetailsData | RoomRedirect | ErrorApiData> {
        if (!this.adminApiUrl) {
            return Promise.reject(new Error("No admin backoffice set!"));
        }

        const params: { playUri: string } = {
            playUri,
        };
        const url = new URL("api/map", this.adminApiUrl);
        url.searchParams.set("playUri", params.playUri);

        try {
            const res = await assertResponseOk(
                await fetch(url, {
                    headers: this.getRequestHeaders(),
                })
            );

            const data = (await res.json()) as unknown;
            const mapDetailData = isMapDetailsData.safeParse(data);

            if (mapDetailData.success) {
                return mapDetailData.data;
            }

            const roomRedirect = isRoomRedirect.safeParse(data);
            if (roomRedirect.success) {
                return roomRedirect.data;
            }

            const errorData = isErrorApiErrorData.safeParse(data);
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
            if (err instanceof HttpError) {
                const errorMessage = `An error occurred during call to /api/map endpoint. HTTP Status: ${err.status}.`;
                Sentry.captureException(`${errorMessage}${err.body ? ` Body: ${err.body}` : ""}`);
                console.error(errorMessage, err);
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
