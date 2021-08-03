import { ADMIN_API_URL, ALLOW_ARTILLERY, SECRET_KEY } from "../Enum/EnvironmentVariable";
import { uuid } from "uuidv4";
import Jwt, { verify } from "jsonwebtoken";
import { TokenInterface } from "../Controller/AuthenticateController";
import { adminApi, AdminBannedData } from "../Services/AdminApi";

export interface AuthTokenData {
    identifier: string; //will be a email if logged in or an uuid if anonymous
}
export const tokenInvalidException = "tokenInvalid";

class JWTTokenManager {
    public createAuthToken(identifier: string) {
        return Jwt.sign({ identifier }, SECRET_KEY, { expiresIn: "3d" });
    }

    public decodeJWTToken(token: string): AuthTokenData {
        try {
            return Jwt.verify(token, SECRET_KEY, { ignoreExpiration: false }) as AuthTokenData;
        } catch (e) {
            throw { reason: tokenInvalidException, message: e.message };
        }
    }
}

export const jwtTokenManager = new JWTTokenManager();
