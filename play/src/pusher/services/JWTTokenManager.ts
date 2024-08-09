import Jwt from "jsonwebtoken";
import z from "zod";
import { ADMIN_SOCKETS_TOKEN, SECRET_KEY } from "../enums/EnvironmentVariable";

export const AuthTokenData = z.object({
    identifier: z.string(), //will be a email if logged in or an uuid if anonymous
    accessToken: z.string().optional(),
    username: z.string().optional(),
    locale: z.string().optional(),
    tags: z.string().array().optional(),
    matrixUserId: z.string().optional(),
});
export type AuthTokenData = z.infer<typeof AuthTokenData>;

export const AccessTokenData = z.object({
    tags: z.string().array().optional(),
});
export type AccessTokenData = z.infer<typeof AccessTokenData>;

export const AdminSocketTokenData = z.object({
    authorizedRoomIds: z.string().array(), //the list of rooms the client is authorized to read from.
});
export type AdminSocketTokenData = z.infer<typeof AdminSocketTokenData>;
export const tokenInvalidException = "tokenInvalid";

export class JWTTokenManager {
    public verifyAdminSocketToken(token: string): AdminSocketTokenData {
        if (!ADMIN_SOCKETS_TOKEN) {
            throw new Error("Missing environment variable ADMIN_SOCKETS_TOKEN");
        }

        const verifiedToken = Jwt.verify(token, ADMIN_SOCKETS_TOKEN);

        return AdminSocketTokenData.parse(verifiedToken);
    }

    public createAuthToken(
        identifier: string,
        accessToken?: string,
        username?: string,
        locale?: string,
        tags?: string[],
        matrixUserId?: string
    ): string {
        return Jwt.sign({ identifier, accessToken, username, locale, tags, matrixUserId }, SECRET_KEY, {
            expiresIn: "30d",
        });
    }

    public verifyJWTToken(token: string, ignoreExpiration = false): AuthTokenData {
        return AuthTokenData.parse(Jwt.verify(token, SECRET_KEY, { ignoreExpiration }));
    }
}

export const jwtTokenManager = new JWTTokenManager();
