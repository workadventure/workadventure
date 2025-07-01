import axios, { AxiosInstance } from "axios";
import pLimit from "p-limit";
import { EventType, ICreateRoomOpts, Visibility } from "matrix-js-sdk";
import * as Sentry from "@sentry/node";
import { slugify } from "@workadventure/shared-utils/src/Jitsi/slugify";
import { MATRIX_ADMIN_PASSWORD, MATRIX_ADMIN_USER, MATRIX_API_URI, MATRIX_DOMAIN } from "../enums/EnvironmentVariable";

const ADMIN_CHAT_ID = `@${MATRIX_ADMIN_USER}:${MATRIX_DOMAIN}`;

const limit = pLimit(10);
class MatrixProvider {
    private accessToken: string | undefined;
    private roomAreaFolderName = slugify("current visited room");
    private roomAreaFolderID: string | undefined;

    constructor() {
        this.overrideRateLimitForAdminAccount().catch((error) => {
            console.error(error);
            Sentry.captureMessage(`Failed to override admin account ratelimit : ${error}`);
        });

        this.createChatFolderAreaAndSetID()
            .then((roomID) => {
                this.roomAreaFolderID = roomID;
            })
            .catch((error) => {
                console.error(error);
                Sentry.captureMessage(`Failed to create chat folder for room area : ${error}`);
            });
    }

    private async getAxios(): Promise<AxiosInstance> {
        const accessToken = await this.getAccessToken();
        return axios.create({
            baseURL: MATRIX_API_URI,
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
    }

    getMatrixIdFromEmail(email: string): string {
        return "@" + this.getBareMatrixIdFromEmail(email) + ":" + MATRIX_DOMAIN;
    }

    getBareMatrixIdFromEmail(email: string): string {
        return email.replace("@", "_");
    }

    private async getAccessToken(): Promise<string> {
        if (!this.accessToken) {
            const response = await axios.post(`${MATRIX_API_URI}_matrix/client/r0/login`, {
                type: "m.login.password",
                user: MATRIX_ADMIN_USER,
                password: MATRIX_ADMIN_PASSWORD,
            });
            if (response.status === 200 && response.data.errcode === undefined) {
                this.accessToken = response.data.access_token;
                return response.data.access_token;
            } else {
                throw new Error("Failed with errcode " + response.data.errcode);
            }
        }

        if (!this.accessToken) {
            throw new Error("No access token found");
        }

        return this.accessToken;
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
            console.error(e);
            Sentry.captureMessage(`Failed to kick all user ${e}`);
            return;
        }
    }
}

export const matrixProvider = new MatrixProvider();
