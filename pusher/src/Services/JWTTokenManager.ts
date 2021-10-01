import { SECRET_KEY } from "../Enum/EnvironmentVariable";
import Jwt from "jsonwebtoken";

export interface AuthTokenData {
    identifier: string; //will be a email if logged in or an uuid if anonymous
    hydraAccessToken?: string;
}
export const tokenInvalidException = "tokenInvalid";

class JWTTokenManager {
    public createAuthToken(identifier: string, hydraAccessToken?: string) {
        return Jwt.sign({ identifier, hydraAccessToken }, SECRET_KEY, { expiresIn: "30d" });
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
