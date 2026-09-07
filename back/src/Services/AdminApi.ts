import axios, { isAxiosError } from "axios";
import type { MapDetailsData, RoomRedirect, ErrorApiData } from "@workadventure/messages";
import { isMapDetailsData, isRoomRedirect, isErrorApiErrorData } from "@workadventure/messages";
import * as Sentry from "@sentry/node";
import { ADMIN_API_TOKEN, ADMIN_API_URL } from "../Enum/EnvironmentVariable";
import { LivekitCredentialsResponse } from "./Repository/LivekitCredentialsResponse";

/**
 * What the admin learns when a recording egress starts or ends. It turns
 * this into customer webhooks (recording.started / completed / failed).
 */
export interface RecordingEventPayload {
    phase: "started" | "ended";
    status: string;
    egressId: string;
    recordingSessionId: string;
    playUri: string;
    recorder: { uuid: string; spaceUserId: string };
    startedAt: string | null;
    endedAt: string | null;
    error: string | null;
    files: { filename: string; sizeBytes: number; durationSeconds: number }[];
}

const RECORDING_EVENT_RETRY_DELAYS_MS = [250, 1_000, 4_000];

class AdminApi {
    /**
     * Tells the admin about a recording lifecycle event. Retried a few times on
     * transport or server errors; a 4xx means the admin rejected the payload
     * and is not retried. Resolves silently when no admin is configured.
     */
    async notifyRecordingEvent(payload: RecordingEventPayload): Promise<void> {
        if (!ADMIN_API_URL) {
            return;
        }

        const url = new URL("api/recordings/events", ADMIN_API_URL).toString();
        const send = async (attempt: number): Promise<void> => {
            try {
                await axios.post(url, payload, {
                    headers: {
                        Authorization: `${ADMIN_API_TOKEN ?? ""}`,
                        Accept: "application/json",
                    },
                    timeout: 5_000,
                });
            } catch (error) {
                const status = isAxiosError(error) ? error.response?.status : undefined;
                const rejected =
                    status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429;
                if (rejected || attempt >= RECORDING_EVENT_RETRY_DELAYS_MS.length) {
                    throw error;
                }
                await new Promise<void>((resolve) => {
                    setTimeout(resolve, RECORDING_EVENT_RETRY_DELAYS_MS[attempt]);
                });
                return send(attempt + 1);
            }
        };

        return send(0);
    }

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
                mapDetailData.error.issues,
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
                    }`,
                );
                console.error(
                    `An error occurred during call to /api/map endpoint. HTTP Status: ${err.status ?? "none"}.`,
                    err,
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
