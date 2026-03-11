import { jwtDecrypt, jwtVerify, SignJWT, errors } from "jose";
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

const secret = new TextEncoder().encode(SECRET_KEY ?? "");

export class JWTTokenManager {
    public verifyAdminSocketToken(token: string): AdminSocketTokenData {
        if (!ADMIN_SOCKETS_TOKEN) {
            throw new Error("Missing environment variable ADMIN_SOCKETS_TOKEN");
        }

        const verifiedToken = jwtVerify(token, secret);

        return AdminSocketTokenData.parse(verifiedToken);
    }

    public async createAuthToken(
        identifier: string,
        accessToken?: string,
        username?: string,
        locale?: string,
        tags?: string[],
        matrixUserId?: string
    ): Promise<string> {
        return new SignJWT({ identifier, accessToken, username, locale, tags, matrixUserId })
            .setExpirationTime("30d")
            .setProtectedHeader({ alg: "HS256" })
            .sign(secret);
    }

    public async verifyJWTToken(token: string, ignoreExpiration = false): Promise<AuthTokenData> {
        try {
            return AuthTokenData.parse((await jwtVerify(token, secret)).payload);
        } catch (error) {
            if (error instanceof errors.JWTExpired && ignoreExpiration) {
                return AuthTokenData.parse((await jwtDecrypt(token, secret)).payload);
            }
            throw error;
        }
    }
}

export const jwtTokenManager = new JWTTokenManager();
