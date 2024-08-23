import axios from "axios";
import { EventType } from "matrix-js-sdk";
import { MATRIX_ADMIN_USER, MATRIX_API_URI, MATRIX_DOMAIN } from "../enums/EnvironmentVariable";

const ADMIN_CHAT_ID = `@${MATRIX_ADMIN_USER}:${MATRIX_DOMAIN}`;
//const ADMIN_CHAT_ID = `@admin:${MATRIX_DOMAIN}`;
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
    //TODO : env var ?
    private roomAreaSpaceName = "space_for_area_room";
    private roomAreaSpaceID: string | undefined;

    constructor() {
        //TODO: DELETE and move in synapse config ?
        this.overrideRateLimitForAdminAccount().catch((error) => console.error(error));

        this.createChatSpaceAreaAndSetID()
            .then((roomID) => {
                this.roomAreaSpaceID = roomID;
            })
            .catch((error) => console.error(error));
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
                    user: process.env.MATRIX_ADMIN_USER,
                    password: process.env.MATRIX_ADMIN_PASSWORD,
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

        if (this.roomAreaSpaceID) {
            options.initial_state.push({
                type: EventType.SpaceParent,
                state_key: this.roomAreaSpaceID,
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
                    return this.AddRoomToSpace(response.data.room_id);
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

    private async createChatSpaceAreaAndSetID(): Promise<string> {
        const spaceAreaID = await this.getChatSpaceAreaID();
        if (spaceAreaID) {
            return Promise.resolve(spaceAreaID);
        }
        return await axios
            .post(
                `${MATRIX_API_URI}_matrix/client/r0/createRoom`,
                {
                    visibility: "public",
                    room_alias_name: this.roomAreaSpaceName,
                    name: "Room Area Space",
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

    private async getChatSpaceAreaID(): Promise<string | undefined> {
        return axios
            .get(`${MATRIX_API_URI}_matrix/client/r0/directory/room/%23${this.roomAreaSpaceName}:${MATRIX_DOMAIN}`, {
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

    async AddRoomToSpace(roomID: string): Promise<string> {
        if (!this.roomAreaSpaceID) {
            console.error(new Error(`Failed to add room : ${roomID} to room area space `));
            return Promise.resolve(roomID);
        }

        const roomLinkContent = {
            via: [MATRIX_DOMAIN],
        };

        return axios
            .put(
                `${MATRIX_API_URI}_matrix/client/r0/rooms/${this.roomAreaSpaceID}/state/m.space.child/${roomID}`,
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
                    return Promise.reject(new Error(`Failed to add room : ${roomID} to room area space `));
                }
            })
            .catch((error) => {
                return Promise.reject(new Error(`Failed to add room : ${roomID} to room area space `));
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
