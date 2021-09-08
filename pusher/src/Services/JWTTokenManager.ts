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
        //TODO fix me 200d when ory authentication will be available
        return Jwt.sign({ identifier }, SECRET_KEY, { expiresIn: "200d" });
    }

    public verifyJWTToken(token: string, ignoreExpiration: boolean = false): AuthTokenData {
        try {
            return Jwt.verify(token, SECRET_KEY, { ignoreExpiration }) as AuthTokenData;
        } catch (e) {
            throw { reason: tokenInvalidException, message: e.message };
        }
    }
}

export const jwtTokenManager = new JWTTokenManager();
