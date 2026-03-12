import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import axios from "axios";
import pLimit from "p-limit";
import type { ICreateRoomOpts } from "matrix-js-sdk";
import { EventType, Visibility } from "matrix-js-sdk";
import { slugify } from "@workadventure/shared-utils/src/Jitsi/slugify.js";
import {
    MATRIX_ADMIN_PASSWORD,
    MATRIX_ADMIN_USER,
    MATRIX_API_URI,
    MATRIX_DOMAIN,
} from "../enums/EnvironmentVariable.ts";
import type { RedisClient } from "./RedisClient.ts";
import { getRedisClient } from "./RedisClient.ts";

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

type MatrixRequestConfig = InternalAxiosRequestConfig & {
    _matrixTokenRetried?: boolean;
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

    private async getAxios(): Promise<AxiosInstance> {
        const accessToken = await this.getAccessToken();
        const axiosInstance = axios.create({
            baseURL: MATRIX_API_URI,
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        axiosInstance.interceptors.response.use(
            (response) => response,
            async (error: unknown) => {
                const requestConfig = axios.isAxiosError(error)
                    ? (error.config as MatrixRequestConfig | undefined)
                    : undefined;
                if (!requestConfig || requestConfig.headers === undefined || !this.isInvalidAccessTokenError(error)) {
                    throw error;
                }

                if (requestConfig._matrixTokenRetried === true) {
                    throw error;
                }

                requestConfig._matrixTokenRetried = true;

                const refreshedAccessToken = await this.refreshAccessToken(accessToken);
                requestConfig.headers.Authorization = `Bearer ${refreshedAccessToken}`;

                return axiosInstance.request(requestConfig);
            }
        );

        return axiosInstance;
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
        const response = await axios.post(`${MATRIX_API_URI}_matrix/client/r0/login`, {
            type: "m.login.password",
            user: MATRIX_ADMIN_USER,
            password: MATRIX_ADMIN_PASSWORD,
        });

        if (response.status === 200 && response.data.errcode === undefined) {
            return response.data.access_token;
        }

        throw new Error("Failed with errcode " + response.data.errcode);
    }

    private isInvalidAccessTokenError(error: unknown): boolean {
        if (!axios.isAxiosError<MatrixErrorResponse>(error)) {
            return false;
        }

        const status = error.response?.status;
        const errcode = error.response?.data?.errcode;
        return status === 401 || errcode === "M_UNKNOWN_TOKEN";
    }

    private wait(delay: number): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(resolve, delay);
        });
    }

    async setNewMatrixPassword(matrixUserId: string, password: string): Promise<void> {
        const axiosInstance = await this.getAxios();
        const response = await axiosInstance.put(`_synapse/admin/v2/users/${matrixUserId}`, {
            logout_devices: false,
            password,
        });
        if (response.status === 200) {
            return;
        } else {
            throw new Error("Failed with status " + response.status);
        }
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

        const axiosInstance = await this.getAxios();
        const response = await axiosInstance.post(`_matrix/client/r0/createRoom`, options);
        if (response.status === 200) {
            return await this.AddRoomToFolder(response.data.room_id);
        } else {
            throw new Error("Failed to add room in folder with status " + response.status);
        }
    }

    async kickUserFromRoom(userID: string, roomID: string): Promise<void> {
        const axiosInstance = await this.getAxios();
        const response = await axiosInstance.post(`_matrix/client/r0/rooms/${roomID}/kick`, {
            reason: "kick",
            user_id: userID,
        });
        if (response.status === 200) {
            return;
        } else {
            throw new Error("Failed with status " + response.status);
        }
    }

    async promoteUserToModerator(userID: string, roomID: string): Promise<void> {
        const axiosInstance = await this.getAxios();
        const actualPowerLevelsResponse = await axiosInstance.get(
            `_matrix/client/r0/rooms/${roomID}/state/m.room.power_levels`
        );

        if (actualPowerLevelsResponse.status !== 200) {
            throw new Error("Failed get actual powerLevels " + actualPowerLevelsResponse.status);
        }

        const response = await axiosInstance.put(`_matrix/client/r0/rooms/${roomID}/state/m.room.power_levels`, {
            ...(actualPowerLevelsResponse.data ?? {}),
            users: {
                ...(actualPowerLevelsResponse.data.users ?? {}),
                [userID]: 50,
            },
        });

        if (response.status === 200) {
            return;
        } else {
            throw new Error("Failed with status " + response.status);
        }
    }
    async inviteUserToRoom(userID: string, roomID: string): Promise<void> {
        if (!roomID) {
            console.error("roomID is undefined or null");
            return;
        }
        const axiosInstance = await this.getAxios();
        const response = await axiosInstance.post(`_matrix/client/r0/rooms/${roomID}/invite`, {
            user_id: userID,
        });
        if (response.status === 200) {
            return;
        } else {
            throw new Error("Failed with status " + response.status);
        }
    }

    async changeRoomName(roomID: string, name: string): Promise<void> {
        const axiosInstance = await this.getAxios();
        const response = await axiosInstance.put(`_matrix/client/r0/rooms/${roomID}/state/m.room.name`, {
            name,
        });
        if (response.status === 200) {
            return;
        } else {
            throw new Error("Failed with status " + response.status);
        }
    }

    private async overrideRateLimitForAdminAccount() {
        const axiosInstance = await this.getAxios();
        const response = await axiosInstance.post(`_synapse/admin/v1/users/${ADMIN_CHAT_ID}/override_ratelimit`, {
            message_per_second: 0,
            burst_count: 0,
        });
        if (response.status === 200) {
            return;
        } else {
            throw new Error("Failed with status " + response.status);
        }
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

        const axiosInstance = await this.getAxios();
        const response = await axiosInstance.post(`_matrix/client/r0/createRoom`, {
            visibility: "public",
            room_alias_name: this.roomAreaFolderName,
            name: this.roomAreaFolderName,
            creation_content: {
                type: "m.space",
            },
        });
        if (response.status === 200) {
            return response.data.room_id;
        } else {
            throw new Error("Failed with status " + response.status);
        }
    }

    private async getChatFolderAreaID(): Promise<string | undefined> {
        const axiosInstance = await this.getAxios();
        const response = await axiosInstance.get(
            `_matrix/client/r0/directory/room/%23${this.roomAreaFolderName}:${MATRIX_DOMAIN}`
        );
        if (response.status === 200) {
            return Promise.resolve(response.data.room_id);
        } else {
            return Promise.resolve(undefined);
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

        const axiosInstance = await this.getAxios();
        const response = await axiosInstance.put(
            `_matrix/client/r0/rooms/${this.roomAreaFolderID}/state/m.space.child/${roomID}`,
            roomLinkContent
        );
        if (response.status === 200) {
            return roomID;
        } else {
            throw new Error(`Failed to add room : ${roomID} to room area folder `);
        }
    }

    async deleteRoom(roomID: string): Promise<void> {
        await this.kickAllUsersFromRoom(roomID);
        return this.kickUserFromRoom(ADMIN_CHAT_ID, roomID);
    }

    async kickAllUsersFromRoom(roomID: string): Promise<void> {
        const axiosInstance = await this.getAxios();
        const response = await axiosInstance.get(`_matrix/client/r0/rooms/${roomID}/members`);

        if (response.status !== 200) {
            throw new Error(`Failed to fetch members for room: ${roomID}`);
        }

        const kickMembersPromises = response.data.chunk.reduce(
            (acc: Promise<void>[], currentMember: { state_key: string; content: { membership: string } }) => {
                if (currentMember.state_key !== ADMIN_CHAT_ID && currentMember.content.membership !== "join") {
                    acc.push(limit(() => this.kickUserFromRoom(currentMember.state_key, roomID)));
                }
                return acc;
            },
            []
        );
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
