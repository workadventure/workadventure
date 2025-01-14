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

  public async resetMatrixUsers() {
    try {
      if (!this.adminLoginToken) {
        const adminLoginResponse = await axios.post<MatrixLoginResponse>(
          LOGIN_ENDPOINT,
          matrixLogin
        );
        const { access_token } = adminLoginResponse.data;
        this.adminLoginToken = access_token;
      }

      const users = await this.getUsers();
      await this.deactivateAndActivateUsers(users);
    } catch (error) {
      console.error(error);
      throw new Error(error)
    } 
  }

  private async getUsers() {
    try {
      const usersResponse = await axios.get<MatrixUsersResponse>(
        USERS_ENDPOINT,
        this.getAuthenticatedHeader()
      );
      return usersResponse.data.users.filter(
        (user) => user.name !== MATRIX_ADMIN_USER
      );
    } catch (error) {
      throw new Error(error);
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
    try {
      for (const user of users) {

        await axios.post(
          `${DEACTIVATE_USER_ENDPOINT}/${user.name}`,
          null,
          this.getAuthenticatedHeader()
        );

        await axios.put(
          `${USERS_ENDPOINT}/${user.name}`,
          {
            deactivated: false,
          },
          this.getAuthenticatedHeader()
        );
      }
    } catch (error) {
      throw new Error(error);
    }
  }

  private getAuthenticatedHeader() {
    return { headers: { Authorization: `Bearer ${this.adminLoginToken}` } };
  }

  public async acceptAllInvitations(alias : string) {
    try {
      const publicRoomsResponse = await axios.get(
        `${matrix_server_url}/_matrix/client/r0/publicRooms`,
        this.getAuthenticatedHeader()
      );

      const room = publicRoomsResponse.data.chunk.find(
        (room) => room.name === alias
      );

      if (room) {
        await axios.post(
          `${matrix_server_url}/_matrix/client/r0/join/${room.room_id}`,
          {},
          this.getAuthenticatedHeader()
        );
      }
    } catch (error) {
      throw new Error(error);
    }
  }

  public async getMemberPowerLevel(roomAlias: string): Promise<number> {
    try {
      const publicRoomsResponse = await axios.get(
        `${matrix_server_url}/_matrix/client/r0/publicRooms`,
        this.getAuthenticatedHeader()
      );

      const room = publicRoomsResponse.data.chunk.find(
        (room) => room.name === roomAlias
      );

      if (!room) {
        throw new Error(`Room ${roomAlias} not found`);
      }

      const powerLevelsResponse = await axios.get(
        `${matrix_server_url}/_matrix/client/r0/rooms/${room.room_id}/state/m.room.power_levels/`,
        this.getAuthenticatedHeader()
      );

      return powerLevelsResponse.data.users[MATRIX_ADMIN_USER] || 0;

    } catch (error) {
      throw new Error(error);
    }
  }

  public async overrideRateLimitForUser(userId: string) {
    try {
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
        }
    );
    if (response.status === 200) {
        return;
    } else {
        throw new Error("Failed with status " + response.status);
    }
} catch (error) {
      throw new Error(error);
    }
  }
}

export default new MatrixApi();
