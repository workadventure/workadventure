import pLimit from "p-limit";
import type { ICreateRoomOpts } from "matrix-js-sdk";
import { EventType, Visibility } from "matrix-js-sdk";
import { slugify } from "@workadventure/shared-utils/src/Jitsi/slugify";
import { fetch, HttpError } from "@workadventure/shared-utils/src/Fetch/nodeFetch";
import { MATRIX_ADMIN_PASSWORD, MATRIX_ADMIN_USER, MATRIX_API_URI, MATRIX_DOMAIN } from "../enums/EnvironmentVariable";
import type { RedisClient } from "./RedisClient";
import { getRedisClient } from "./RedisClient";

const ADMIN_CHAT_ID = `@${MATRIX_ADMIN_USER}:${MATRIX_DOMAIN}`;
const ACCESS_TOKEN_REDIS_KEY = `matrix-admin-access-token:${MATRIX_DOMAIN}:${MATRIX_ADMIN_USER}`;
const ACCESS_TOKEN_LOCK_REDIS_KEY = `matrix-admin-access-token-lock:${MATRIX_DOMAIN}:${MATRIX_ADMIN_USER}`;
const ACCESS_TOKEN_LOCK_TTL_SECONDS = 30;
const ACCESS_TOKEN_LOCK_WAIT_MS = 500;
const ACCESS_TOKEN_LOCK_TIMEOUT_MS = ACCESS_TOKEN_LOCK_TTL_SECONDS * 1000 + 5_000;

const limit = pLimit(10);

type MatrixErrorResponse = {
    errcode?: string;
};

type MatrixLoginResponse = MatrixErrorResponse & {
    access_token?: string;
};

type MatrixCreateRoomResponse = {
    room_id: string;
};

type MatrixDirectoryRoomResponse = {
    room_id: string;
};

type MatrixPowerLevelsResponse = {
    users?: Record<string, number>;
    [key: string]: unknown;
};

type MatrixRoomMembersResponse = {
    chunk: Array<{ state_key: string; content: { membership: string } }>;
};

class MatrixProvider {
    private accessToken: string | undefined;
    private accessTokenPromise: Promise<string> | undefined;
    private roomAreaFolderName = slugify("current visited room");
    private roomAreaFolderID: string | undefined;

    constructor() {
        this.overrideRateLimitForAdminAccount().catch((error) => {
            console.error("Failed to override admin account ratelimit:", error);
        });

        this.createChatFolderAreaAndSetID()
            .then((roomID) => {
                this.roomAreaFolderID = roomID;
            })
            .catch((error) => {
                console.error("Failed to create chat folder for room area:", error);
            });
    }

    private buildMatrixUrl(path: string): URL {
        if (!MATRIX_API_URI) {
            throw new Error("MATRIX_API_URI is not configured");
        }

        return new URL(path, MATRIX_API_URI.endsWith("/") ? MATRIX_API_URI : `${MATRIX_API_URI}/`);
    }

    private getJsonHeaders(headers?: HeadersInit): Headers {
        const requestHeaders = new Headers(headers);
        requestHeaders.set("Content-Type", "application/json");
        return requestHeaders;
    }

    private async matrixFetch(path: string, init?: RequestInit, canRetry = true): Promise<Response> {
        const accessToken = await this.getAccessToken();
        return this.matrixFetchWithAccessToken(path, accessToken, init, canRetry);
    }

    private async matrixFetchWithAccessToken(
        path: string,
        accessToken: string,
        init?: RequestInit,
        canRetry = true
    ): Promise<Response> {
        const headers = new Headers(init?.headers);
        headers.set("Authorization", `Bearer ${accessToken}`);

        try {
            return await fetch(this.buildMatrixUrl(path), {
                ...init,
                headers,
            });
        } catch (error) {
            if (!canRetry || !this.isInvalidAccessTokenError(error)) {
                throw error;
            }

            const refreshedAccessToken = await this.refreshAccessToken(accessToken);
            headers.set("Authorization", `Bearer ${refreshedAccessToken}`);

            return fetch(this.buildMatrixUrl(path), {
                ...init,
                headers,
            });
        }
    }

    getMatrixIdFromEmail(email: string): string {
        return "@" + this.getBareMatrixIdFromEmail(email) + ":" + MATRIX_DOMAIN;
    }

    getBareMatrixIdFromEmail(email: string): string {
        return email.replace("@", "_");
    }

    private async getAccessToken(): Promise<string> {
        if (this.accessToken) {
            return this.accessToken;
        }

        if (this.accessTokenPromise) {
            return this.accessTokenPromise;
        }

        const accessTokenPromise = this.loadAccessToken();
        this.accessTokenPromise = accessTokenPromise;

        try {
            const accessToken = await accessTokenPromise;
            this.accessToken = accessToken;
            return accessToken;
        } finally {
            if (this.accessTokenPromise === accessTokenPromise) {
                this.accessTokenPromise = undefined;
            }
        }
    }

    private async loadAccessToken(): Promise<string> {
        const redisClient = await getRedisClient();
        if (redisClient) {
            const cachedAccessToken = await redisClient.get(ACCESS_TOKEN_REDIS_KEY);
            if (cachedAccessToken) {
                return cachedAccessToken;
            }

            return this.loginAndCacheAccessToken(redisClient);
        }

        return this.loginToMatrix();
    }

    private async refreshAccessToken(invalidAccessToken: string): Promise<string> {
        await this.invalidateAccessToken(invalidAccessToken);
        return this.getAccessToken();
    }

    private async invalidateAccessToken(invalidAccessToken: string): Promise<void> {
        if (this.accessToken === invalidAccessToken) {
            this.accessToken = undefined;
        }

        const redisClient = await getRedisClient();
        if (!redisClient) {
            return;
        }

        const cachedAccessToken = await redisClient.get(ACCESS_TOKEN_REDIS_KEY);
        if (cachedAccessToken === invalidAccessToken) {
            await redisClient.del(ACCESS_TOKEN_REDIS_KEY);
        }
    }

    private async loginAndCacheAccessToken(redisClient: RedisClient): Promise<string> {
        const lockValue = `${process.pid}-${Date.now()}-${Math.random()}`;
        const deadline = Date.now() + ACCESS_TOKEN_LOCK_TIMEOUT_MS;

        /* eslint-disable no-await-in-loop */
        while (Date.now() < deadline) {
            const cachedAccessToken = await redisClient.get(ACCESS_TOKEN_REDIS_KEY);
            if (cachedAccessToken) {
                return cachedAccessToken;
            }

            const lockWasAcquired = await redisClient.set(ACCESS_TOKEN_LOCK_REDIS_KEY, lockValue, {
                NX: true,
                EX: ACCESS_TOKEN_LOCK_TTL_SECONDS,
            });

            if (lockWasAcquired) {
                try {
                    const cachedAccessTokenAfterLock = await redisClient.get(ACCESS_TOKEN_REDIS_KEY);
                    if (cachedAccessTokenAfterLock) {
                        return cachedAccessTokenAfterLock;
                    }

                    const accessToken = await this.loginToMatrix();
                    await redisClient.set(ACCESS_TOKEN_REDIS_KEY, accessToken);
                    return accessToken;
                } finally {
                    await this.releaseLoginLock(redisClient, lockValue);
                }
            }

            await this.wait(ACCESS_TOKEN_LOCK_WAIT_MS);
        }
        /* eslint-enable no-await-in-loop */

        throw new Error("Timed out while waiting for the Matrix admin access token lock");
    }

    private async releaseLoginLock(redisClient: RedisClient, lockValue: string): Promise<void> {
        const currentLockValue = await redisClient.get(ACCESS_TOKEN_LOCK_REDIS_KEY);
        if (currentLockValue === lockValue) {
            await redisClient.del(ACCESS_TOKEN_LOCK_REDIS_KEY);
        }
    }

    private async loginToMatrix(): Promise<string> {
        const response = await fetch(this.buildMatrixUrl("_matrix/client/r0/login"), {
            method: "POST",
            headers: this.getJsonHeaders(),
            body: JSON.stringify({
                type: "m.login.password",
                user: MATRIX_ADMIN_USER,
                password: MATRIX_ADMIN_PASSWORD,
            }),
        });

        const data = (await response.json()) as MatrixLoginResponse;
        if (typeof data.access_token === "string" && data.errcode === undefined) {
            return data.access_token;
        }

        throw new Error("Failed with errcode " + data.errcode);
    }

    private isInvalidAccessTokenError(error: unknown): boolean {
        if (!(error instanceof HttpError)) {
            return false;
        }

        let errcode: string | undefined;
        if (error.fullBody) {
            try {
                errcode = (JSON.parse(error.fullBody) as MatrixErrorResponse).errcode;
            } catch {
                errcode = undefined;
            }
        }

        return error.status === 401 || errcode === "M_UNKNOWN_TOKEN";
    }

    private wait(delay: number): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(resolve, delay);
        });
    }

    async setNewMatrixPassword(matrixUserId: string, password: string): Promise<void> {
        await this.matrixFetch(`_synapse/admin/v2/users/${matrixUserId}`, {
            method: "PUT",
            headers: this.getJsonHeaders(),
            body: JSON.stringify({
                logout_devices: false,
                password,
            }),
        });
    }

    async createRoomForArea(): Promise<string> {
        const options: ICreateRoomOpts = {
            visibility: Visibility.Private,
            initial_state: [
                {
                    type: EventType.RoomHistoryVisibility,
                    content: { history_visibility: "joined" },
                },
            ],
            power_level_content_override: {
                invite: 100,
                ban: 50,
                kick: 50,
            },
        };

        if (this.roomAreaFolderID && MATRIX_DOMAIN) {
            options.initial_state?.push({
                type: EventType.SpaceParent,
                state_key: this.roomAreaFolderID,
                content: {
                    via: [MATRIX_DOMAIN],
                },
            });
        }

        const response = await this.matrixFetch("_matrix/client/r0/createRoom", {
            method: "POST",
            headers: this.getJsonHeaders(),
            body: JSON.stringify(options),
        });
        const data = (await response.json()) as MatrixCreateRoomResponse;

        return this.AddRoomToFolder(data.room_id);
    }

    async kickUserFromRoom(userID: string, roomID: string): Promise<void> {
        await this.matrixFetch(`_matrix/client/r0/rooms/${roomID}/kick`, {
            method: "POST",
            headers: this.getJsonHeaders(),
            body: JSON.stringify({
                reason: "kick",
                user_id: userID,
            }),
        });
    }

    async promoteUserToModerator(userID: string, roomID: string): Promise<void> {
        const actualPowerLevelsResponse = await this.matrixFetch(
            `_matrix/client/r0/rooms/${roomID}/state/m.room.power_levels`
        );
        const actualPowerLevels = (await actualPowerLevelsResponse.json()) as MatrixPowerLevelsResponse;

        await this.matrixFetch(`_matrix/client/r0/rooms/${roomID}/state/m.room.power_levels`, {
            method: "PUT",
            headers: this.getJsonHeaders(),
            body: JSON.stringify({
                ...actualPowerLevels,
                users: {
                    ...(actualPowerLevels.users ?? {}),
                    [userID]: 50,
                },
            }),
        });
    }

    async inviteUserToRoom(userID: string, roomID: string): Promise<void> {
        if (!roomID) {
            console.error("roomID is undefined or null");
            return;
        }

        await this.matrixFetch(`_matrix/client/r0/rooms/${roomID}/invite`, {
            method: "POST",
            headers: this.getJsonHeaders(),
            body: JSON.stringify({
                user_id: userID,
            }),
        });
    }

    async changeRoomName(roomID: string, name: string): Promise<void> {
        await this.matrixFetch(`_matrix/client/r0/rooms/${roomID}/state/m.room.name`, {
            method: "PUT",
            headers: this.getJsonHeaders(),
            body: JSON.stringify({
                name,
            }),
        });
    }

    private async overrideRateLimitForAdminAccount() {
        await this.matrixFetch(`_synapse/admin/v1/users/${ADMIN_CHAT_ID}/override_ratelimit`, {
            method: "POST",
            headers: this.getJsonHeaders(),
            body: JSON.stringify({
                message_per_second: 0,
                burst_count: 0,
            }),
        });
    }

    private async createChatFolderAreaAndSetID(): Promise<string> {
        try {
            const folderAreaID = await this.getChatFolderAreaID();
            if (folderAreaID) {
                return Promise.resolve(folderAreaID);
            }
        } catch (error) {
            console.info(`Failed to get chat folder area ID, creating one ${error}`);
        }

        const response = await this.matrixFetch(`_matrix/client/r0/createRoom`, {
            method: "POST",
            headers: this.getJsonHeaders(),
            body: JSON.stringify({
                visibility: "public",
                room_alias_name: this.roomAreaFolderName,
                name: this.roomAreaFolderName,
                creation_content: {
                    type: "m.space",
                },
            }),
        });
        const data = (await response.json()) as MatrixCreateRoomResponse;

        return data.room_id;
    }

    private async getChatFolderAreaID(): Promise<string | undefined> {
        try {
            const response = await this.matrixFetch(
                `_matrix/client/r0/directory/room/%23${this.roomAreaFolderName}:${MATRIX_DOMAIN}`
            );
            const data = (await response.json()) as MatrixDirectoryRoomResponse;
            return data.room_id;
        } catch (error) {
            if (error instanceof HttpError && error.status === 404) {
                return undefined;
            }

            throw error;
        }
    }

    async AddRoomToFolder(roomID: string): Promise<string> {
        if (!this.roomAreaFolderID) {
            console.error(new Error(`Failed to add room : ${roomID} to room area folder `));
            return roomID;
        }

        const roomLinkContent = {
            via: [MATRIX_DOMAIN],
        };

        await this.matrixFetch(`_matrix/client/r0/rooms/${this.roomAreaFolderID}/state/m.space.child/${roomID}`, {
            method: "PUT",
            headers: this.getJsonHeaders(),
            body: JSON.stringify(roomLinkContent),
        });

        return roomID;
    }

    async deleteRoom(roomID: string): Promise<void> {
        await this.kickAllUsersFromRoom(roomID);
        return this.kickUserFromRoom(ADMIN_CHAT_ID, roomID);
    }

    async kickAllUsersFromRoom(roomID: string): Promise<void> {
        const response = await this.matrixFetch(`_matrix/client/r0/rooms/${roomID}/members`);
        const data = (await response.json()) as MatrixRoomMembersResponse;

        const kickMembersPromises = data.chunk.reduce((acc: Promise<void>[], currentMember) => {
            if (currentMember.state_key !== ADMIN_CHAT_ID && currentMember.content.membership !== "join") {
                acc.push(limit(() => this.kickUserFromRoom(currentMember.state_key, roomID)));
            }
            return acc;
        }, []);
        try {
            await Promise.all(kickMembersPromises);
            return;
        } catch (e) {
            console.error("Failed to kick all user", e);
            return;
        }
    }
}

export const matrixProvider = new MatrixProvider();
