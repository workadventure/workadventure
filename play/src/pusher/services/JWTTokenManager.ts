import { jwtVerify, SignJWT, errors } from "jose";
import z from "zod";
import { ADMIN_SOCKETS_TOKEN, SECRET_KEY } from "../enums/EnvironmentVariable";

export const AuthTokenData = z.object({
    identifier: z.string(), //will be a email if logged in or an uuid if anonymous
    accessToken: z.string().optional(),
    username: z.string().optional(),
    locale: z.string().optional(),
    tags: z.preprocess(
        (val) => {
            if (typeof val === "string") {
                try {
                    return JSON.parse(val);
                } catch {
                    return [val];
                }
            }
            return val;
        },
        z.string().array()
    ).optional(),
    matrixUserId: z.string().optional(),
});
export type AuthTokenData = z.infer<typeof AuthTokenData>;

export const AccessTokenData = z.object({
    tags: z.preprocess(
        (val) => {
            if (typeof val === "string") {
                try {
                    return JSON.parse(val);
                } catch {
                    return [val];
                }
            }
            return val;
        },
        z.string().array()
    ).optional(),
});
export type AccessTokenData = z.infer<typeof AccessTokenData>;

export const AdminSocketTokenData = z.object({
    authorizedRoomIds: z.string().array(), //the list of rooms the client is authorized to read from.
});
export type AdminSocketTokenData = z.infer<typeof AdminSocketTokenData>;
export const tokenInvalidException = "tokenInvalid";

const secret = new TextEncoder().encode(SECRET_KEY ?? "");
const adminSocketsSecret = new TextEncoder().encode(ADMIN_SOCKETS_TOKEN ?? "");

export class JWTTokenManager {
    public async verifyAdminSocketToken(token: string): Promise<AdminSocketTokenData> {
        if (!ADMIN_SOCKETS_TOKEN) {
            throw new Error("Missing environment variable ADMIN_SOCKETS_TOKEN");
        }

        const verifiedToken = (await jwtVerify(token, adminSocketsSecret)).payload;

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
            if (ignoreExpiration && error instanceof errors.JWTExpired) {
                return AuthTokenData.parse(error.payload);
            }
            throw new errors.JWTInvalid("Token is invalid");
        }
    }
}

export const jwtTokenManager = new JWTTokenManager();
