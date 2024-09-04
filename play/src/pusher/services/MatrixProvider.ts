import axios from "axios";
import { EventType } from "matrix-js-sdk";
import * as Sentry from "@sentry/node";
import { MATRIX_ADMIN_USER, MATRIX_API_URI, MATRIX_DOMAIN, MATRIX_ADMIN_PASSWORD } from "../enums/EnvironmentVariable";
const ADMIN_CHAT_ID = `@${MATRIX_ADMIN_USER}:${MATRIX_DOMAIN}`;
interface CreateRoomOptions {
    visibility: string;
    initial_state: {
        type: EventType;
        state_key?: string;
        content:
            | {
                  history_visibility: string;
              }
            | {
                  via: string[];
              };
    }[];
}
class MatrixProvider {
    private accessToken: string | undefined;
    private lastAccessTokenDate: number = Date.now();
    private roomAreaFolderName = "current visited room";
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

    getMatrixIdFromEmail(email: string): string {
        return "@" + this.getBareMatrixIdFromEmail(email) + ":" + MATRIX_DOMAIN;
    }

    getBareMatrixIdFromEmail(email: string): string {
        return email.replace("@", "_");
    }

    async getAccessToken(): Promise<string> {
        if (
            (this.accessToken && this.lastAccessTokenDate && Date.now() - this.lastAccessTokenDate > 3_600_000) ||
            !this.accessToken
        ) {
            await axios
                .post(`${MATRIX_API_URI}_matrix/client/r0/login`, {
                    type: "m.login.password",
                    user: MATRIX_ADMIN_USER,
                    password: MATRIX_ADMIN_PASSWORD,
                })
                .then((response) => {
                    if (response.status === 200 && response.data.errcode === undefined) {
                        this.accessToken = response.data.access_token;
                        this.lastAccessTokenDate = Date.now();
                        return Promise.resolve();
                    } else {
                        return Promise.reject(new Error("Failed with errcode " + response.data.errcode));
                    }
                });
        }
        if (!this.accessToken) {
            throw new Error("No access token found");
        }
        return this.accessToken;
    }

    async setNewMatrixPassword(matrixUserId: string, password: string): Promise<void> {
        return await axios
            .put(
                `${MATRIX_API_URI}_synapse/admin/v2/users/${matrixUserId}`,
                {
                    logout_devices: false,
                    password,
                },
                {
                    headers: {
                        Authorization: "Bearer " + (await this.getAccessToken()),
                    },
                }
            )
            .then((response) => {
                if (response.status === 200) {
                    return Promise.resolve();
                } else {
                    return Promise.reject(new Error("Failed with status " + response.status));
                }
            });
    }

    async createRoomForArea(): Promise<string> {
        const options: CreateRoomOptions = {
            visibility: "private",
            initial_state: [
                {
                    type: EventType.RoomHistoryVisibility,
                    content: { history_visibility: "joined" },
                },
            ],
        };

        if (this.roomAreaFolderID) {
            options.initial_state.push({
                type: EventType.SpaceParent,
                state_key: this.roomAreaFolderID,
                content: {
                    via: [MATRIX_DOMAIN],
                },
            });
        }

        let roomID: string | undefined;

        return axios
            .post(`${MATRIX_API_URI}_matrix/client/r0/createRoom`, options, {
                headers: {
                    Authorization: "Bearer " + (await this.getAccessToken()),
                },
            })
            .then((response) => {
                if (response.status === 200) {
                    roomID = response.data.room_id;
                    return this.AddRoomToFolder(response.data.room_id);
                } else {
                    return Promise.reject(new Error("Failed with status " + response.status));
                }
            })
            .catch((error) => {
                console.error(error);
                if (roomID) {
                    return Promise.resolve(roomID);
                }

                return Promise.reject(new Error("Failed to create room"));
            });
    }

    async kickUserFromRoom(userID: string, roomID: string): Promise<void> {
        return await axios
            .post(
                `${MATRIX_API_URI}_matrix/client/r0/rooms/${roomID}/kick`,
                {
                    reason: "kick",
                    user_id: userID,
                },
                {
                    headers: {
                        Authorization: "Bearer " + (await this.getAccessToken()),
                    },
                }
            )
            .then((response) => {
                if (response.status === 200) {
                    return Promise.resolve();
                } else {
                    return Promise.reject(new Error("Failed with status " + response.status));
                }
            });
    }

    async inviteUserToRoom(userID: string, roomID: string): Promise<void> {
        if (!roomID) {
            console.error("roomID is undefined or null");
            return;
        }
        return await axios
            .post(
                `${MATRIX_API_URI}_matrix/client/r0/rooms/${roomID}/invite`,
                {
                    user_id: userID,
                },
                {
                    headers: {
                        Authorization: "Bearer " + (await this.getAccessToken()),
                    },
                }
            )
            .then((response) => {
                if (response.status === 200) {
                    return Promise.resolve();
                } else {
                    return Promise.reject(new Error("Failed with status " + response.status));
                }
            });
    }

    async changeRoomName(roomID: string, name: string): Promise<void> {
        return await axios
            .put(
                `${MATRIX_API_URI}_matrix/client/r0/rooms/${roomID}/state/m.room.name`,
                {
                    name,
                },
                {
                    headers: {
                        Authorization: "Bearer " + (await this.getAccessToken()),
                    },
                }
            )
            .then((response) => {
                if (response.status === 200) {
                    return Promise.resolve();
                } else {
                    return Promise.reject(new Error("Failed with status " + response.status));
                }
            });
    }

    private async overrideRateLimitForAdminAccount() {
        return await axios
            .post(
                `${MATRIX_API_URI}_synapse/admin/v1/users/${ADMIN_CHAT_ID}/override_ratelimit`,
                {
                    message_per_second: 0,
                    burst_count: 0,
                },
                {
                    headers: {
                        Authorization: "Bearer " + (await this.getAccessToken()),
                    },
                }
            )
            .then((response) => {
                if (response.status === 200) {
                    return Promise.resolve();
                } else {
                    return Promise.reject(new Error("Failed with status " + response.status));
                }
            });
    }

    private async createChatFolderAreaAndSetID(): Promise<string> {
        const folderAreaID = await this.getChatFolderAreaID();
        if (folderAreaID) {
            return Promise.resolve(folderAreaID);
        }
        return await axios
            .post(
                `${MATRIX_API_URI}_matrix/client/r0/createRoom`,
                {
                    visibility: "public",
                    room_alias_name: this.roomAreaFolderName,
                    name: this.roomAreaFolderName,
                    creation_content: {
                        type: "m.space",
                    },
                },
                {
                    headers: {
                        Authorization: "Bearer " + (await this.getAccessToken()),
                    },
                }
            )
            .then((response) => {
                if (response.status === 200) {
                    return Promise.resolve(response.data.room_id);
                } else {
                    return Promise.reject(new Error("Failed with status " + response.status));
                }
            });
    }

    private async getChatFolderAreaID(): Promise<string | undefined> {
        return axios
            .get(`${MATRIX_API_URI}_matrix/client/r0/directory/room/%23${this.roomAreaFolderName}:${MATRIX_DOMAIN}`, {
                headers: {
                    Authorization: "Bearer " + (await this.getAccessToken()),
                },
            })
            .then((response) => {
                if (response.status === 200) {
                    return Promise.resolve(response.data.room_id);
                } else {
                    return Promise.resolve(undefined);
                }
            })
            .catch((error) => {
                console.error(error);
                return Promise.resolve(undefined);
            });
    }

    async AddRoomToFolder(roomID: string): Promise<string> {
        if (!this.roomAreaFolderID) {
            console.error(new Error(`Failed to add room : ${roomID} to room area folder `));
            return Promise.resolve(roomID);
        }

        const roomLinkContent = {
            via: [MATRIX_DOMAIN],
        };

        return axios
            .put(
                `${MATRIX_API_URI}_matrix/client/r0/rooms/${this.roomAreaFolderID}/state/m.space.child/${roomID}`,
                roomLinkContent,
                {
                    headers: {
                        Authorization: `Bearer ${await this.getAccessToken()}`,
                    },
                }
            )
            .then((response) => {
                if (response.status === 200) {
                    return Promise.resolve(roomID);
                } else {
                    return Promise.reject(new Error(`Failed to add room : ${roomID} to room area folder `));
                }
            })
            .catch((error) => {
                return Promise.reject(new Error(`Failed to add room : ${roomID} to room area folder `));
            });
    }

    deleteRoom(roomID: string): Promise<void> {
        return this.kickAllUsersFromRoom(roomID)
            .then(() => {
                return this.kickUserFromRoom(ADMIN_CHAT_ID, roomID);
            })
            .catch((error) => {
                console.error("Failed to delete room : " + roomID);
                return Promise.reject(new Error("Failed to delete room : " + roomID));
            });
    }

    async kickAllUsersFromRoom(roomID: string): Promise<void> {
        return axios
            .get(`${MATRIX_API_URI}_matrix/client/r0/rooms/${roomID}/members`, {
                headers: {
                    Authorization: `Bearer ${await this.getAccessToken()}`,
                },
            })
            .then((response) => {
                if (response.status !== 200) {
                    throw new Error(`Failed to fetch members for room: ${roomID}`);
                }

                const kickMembersPromises = response.data.chunk.reduce(
                    (acc: Promise<void>[], currentMember: { state_key: string; content: { membership: string } }) => {
                        if (currentMember.state_key !== ADMIN_CHAT_ID && currentMember.content.membership !== "join") {
                            acc.push(this.kickUserFromRoom(currentMember.state_key, roomID));
                        }
                        return acc;
                    },
                    []
                );

                return Promise.all(kickMembersPromises);
            })
            .then(() => {
                return Promise.resolve();
            })
            .catch((error) => {
                console.error("Failed to kick all user from room : " + roomID, error);
                return Promise.reject(new Error("Failed to kick all user from room : " + roomID));
            });
    }
}

export const matrixProvider = new MatrixProvider();
