import fs from "fs";
import { asError } from "catch-unknown";
import axios from "axios";
import { matrix_domain, matrix_server_url } from "../utils/urls";

const LOGIN_ENDPOINT = `${matrix_server_url}/_matrix/client/v3/login`;

const USERS_ENDPOINT = `${matrix_server_url}/_synapse/admin/v2/users`;

const DEACTIVATE_USER_ENDPOINT = `${matrix_server_url}/_synapse/admin/v1/deactivate`;

const MATRIX_ADMIN_USER = `@admin:${matrix_domain}`;

interface MatrixLoginBody {
    type: "m.login.password" | string;
    identifier: {
        type: "m.id.user";
        user: string;
    };
    password: string;
}

interface MatrixLoginResponse {
    user_id: string;
    access_token: string;
}

interface MatrixUsersResponse {
    users: { name: string }[];
    name: string;
}

interface MatrixPublicRoomsChunkRoom {
    name: string;
    room_id: string;
}

interface MatrixPublicRoomsResponse {
    chunk: MatrixPublicRoomsChunkRoom[];
}

const matrixLogin: MatrixLoginBody = {
    type: "m.login.password",
    identifier: {
        type: "m.id.user",
        user: "admin",
    },
    password: "MySecretPassword",
};

class MatrixApi {
    private adminLoginToken: string;

    /**
     * Matrix room IDs must be percent-encoded when used in URL paths (see Matrix Client-Server API).
     */
    private encodeRoomIdForPath(roomId: string): string {
        return encodeURIComponent(roomId);
    }

    private async ensureAdminAccessToken(): Promise<void> {
        if (!this.adminLoginToken) {
            const adminLoginResponse = await axios.post<MatrixLoginResponse>(LOGIN_ENDPOINT, matrixLogin);
            this.adminLoginToken = adminLoginResponse.data.access_token;
        }
    }

    public async resetMatrixUsers() {
        try {
            await this.ensureAdminAccessToken();

            const users = await this.getUsers();
            await this.deactivateAndActivateUsers(users);
        } catch (error) {
            console.error(error);
            throw error;
        }

        // When users are deactivated and activated again, the ACCESS_TOKEN changes. The Access token is stored in .auth folder in the browser's local storage.
        // To avoid issues, we clear the ./.auth/*.json files.
        const authFolderPath = "./.auth";
        try {
            const files = await fs.promises.readdir(authFolderPath);
            for (const file of files) {
                if (file.endsWith(".json")) {
                    await fs.promises.unlink(`${authFolderPath}/${file}`);
                }
            }
        } catch (error) {
            // If the .auth folder does not exist, we do nothing
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
                console.error("Error while clearing .auth folder:", error);
                throw error;
            }
        }
    }

    private async getUsers() {
        try {
            const usersResponse = await axios.get<MatrixUsersResponse>(USERS_ENDPOINT, this.getAuthenticatedHeader());
            return usersResponse.data.users.filter((user) => user.name !== MATRIX_ADMIN_USER);
        } catch (error) {
            throw asError(error);
        }
    }

    /**
     * It's not allowed to remove users in matrix using synapse server.
     * The correct way to do so, is to deactivate the user (it will remove all
     * properties related to e2ee) and activate it after.
     * @param users
     * @private
     */
    private async deactivateAndActivateUsers(users: { name: string }[]) {
        for (const user of users) {
            await axios.post(`${DEACTIVATE_USER_ENDPOINT}/${user.name}`, null, this.getAuthenticatedHeader());

            await axios.put(
                `${USERS_ENDPOINT}/${user.name}`,
                {
                    deactivated: false,
                },
                this.getAuthenticatedHeader(),
            );
        }
    }

    private getAuthenticatedHeader() {
        return { headers: { Authorization: `Bearer ${this.adminLoginToken}` } };
    }

    public async acceptAllInvitations(alias: string) {
        try {
            await this.ensureAdminAccessToken();
            const publicRoomsResponse = await axios.get<MatrixPublicRoomsResponse>(
                `${matrix_server_url}/_matrix/client/r0/publicRooms`,
                this.getAuthenticatedHeader(),
            );

            const room = publicRoomsResponse.data.chunk.find((r) => r.name === alias);

            if (room) {
                await axios.post(
                    `${matrix_server_url}/_matrix/client/r0/join/${this.encodeRoomIdForPath(room.room_id)}`,
                    {},
                    this.getAuthenticatedHeader(),
                );
            }
        } catch (error) {
            throw asError(error);
        }
    }

    public async acceptRoomInvitations(roomId: string) {
        if (roomId) {
            try {
                await this.ensureAdminAccessToken();
                await axios.post(
                    `${matrix_server_url}/_matrix/client/r0/join/${this.encodeRoomIdForPath(roomId)}`,
                    {},
                    this.getAuthenticatedHeader(),
                );
            } catch (error) {
                throw asError(error);
            }
        }
    }

    public async getMemberPowerLevel(roomId: string): Promise<number> {
        try {
            await this.ensureAdminAccessToken();
            const powerLevelsResponse = await axios.get(
                `${matrix_server_url}/_matrix/client/r0/rooms/${this.encodeRoomIdForPath(roomId)}/state/m.room.power_levels/`,
                this.getAuthenticatedHeader(),
            );

            return powerLevelsResponse.data.users[MATRIX_ADMIN_USER] || 0;
        } catch (error) {
            throw asError(error);
        }
    }

    /**
     * Uses the Synapse admin API to obtain an access token for an arbitrary user. This is required to
     * read/write room state of private rooms, because the `@admin` user is not a member of them.
     * See https://element-hq.github.io/synapse/latest/admin_api/user_admin_api.html#login-as-a-user
     */
    public async loginAsUser(userId: string): Promise<string> {
        try {
            await this.ensureAdminAccessToken();
            const response = await axios.post<MatrixLoginResponse>(
                `${matrix_server_url}/_synapse/admin/v1/users/${this.encodeRoomIdForPath(userId)}/login`,
                {},
                this.getAuthenticatedHeader(),
            );
            return response.data.access_token;
        } catch (error) {
            throw asError(error);
        }
    }

    /**
     * Reads a single room state event (e.g. "m.room.join_rules", "m.room.history_visibility",
     * "m.room.name") using the provided user access token.
     */
    public async getRoomStateEvent<T = Record<string, unknown>>(
        userToken: string,
        roomId: string,
        eventType: string,
    ): Promise<T> {
        try {
            const response = await axios.get<T>(
                `${matrix_server_url}/_matrix/client/r0/rooms/${this.encodeRoomIdForPath(roomId)}/state/${eventType}/`,
                { headers: { Authorization: `Bearer ${userToken}` } },
            );
            return response.data;
        } catch (error) {
            throw asError(error);
        }
    }

    /**
     * Writes a single room state event using the provided user access token. Tests use this to force a
     * room into a state the creation UI cannot produce (e.g. a "public" join rule).
     */
    public async setRoomStateEvent(
        userToken: string,
        roomId: string,
        eventType: string,
        content: Record<string, unknown>,
    ): Promise<void> {
        try {
            await axios.put(
                `${matrix_server_url}/_matrix/client/r0/rooms/${this.encodeRoomIdForPath(roomId)}/state/${eventType}/`,
                content,
                { headers: { Authorization: `Bearer ${userToken}` } },
            );
        } catch (error) {
            throw asError(error);
        }
    }

    /**
     * Returns an access token for the creator of a room (its sole non-admin member for a freshly
     * created private room), using the Synapse admin API. This avoids hard-coding the Matrix id of the
     * OIDC test user. The members endpoint reads current room state, so it is available immediately
     * after the room is created (unlike the stats-backed admin room-list endpoint).
     */
    public async getRoomCreatorToken(roomId: string): Promise<string> {
        try {
            await this.ensureAdminAccessToken();
            const response = await axios.get<{ members: string[] }>(
                `${matrix_server_url}/_synapse/admin/v1/rooms/${this.encodeRoomIdForPath(roomId)}/members`,
                this.getAuthenticatedHeader(),
            );
            const creator =
                response.data.members.find((member) => member !== MATRIX_ADMIN_USER) ?? response.data.members[0];
            if (!creator) {
                throw new Error(`Room ${roomId} has no members`);
            }
            return await this.loginAsUser(creator);
        } catch (error) {
            throw asError(error);
        }
    }

    public async overrideRateLimitForUser(userId: string) {
        try {
            await this.ensureAdminAccessToken();
            const response = await axios.post(
                `${matrix_server_url}/_synapse/admin/v1/users/${userId}/override_ratelimit`,
                {
                    message_per_second: 0,
                    burst_count: 0,
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.adminLoginToken}`,
                    },
                },
            );
            if (response.status === 200) {
                return;
            } else {
                throw new Error("Failed with status " + response.status);
            }
        } catch (error) {
            throw asError(error);
        }
    }
}

export default new MatrixApi();
