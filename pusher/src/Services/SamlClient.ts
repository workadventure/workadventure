import { IntrospectionResponse } from "openid-client";
import { adminApi } from "./AdminApi";

class SamlClient {
    public getUserInfo(samlAccessUserId: string) {
        return this.checkTokenAuth(samlAccessUserId);
    }

    public checkTokenAuth(samlAccessUserId: string): Promise<unknown> {
        return adminApi.checkSamlConnexion(samlAccessUserId);
    }
}

export const samlClient = new SamlClient();
