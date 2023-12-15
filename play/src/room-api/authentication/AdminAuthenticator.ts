import { Status } from "@grpc/grpc-js/build/src/constants";
import axios, { isAxiosError } from "axios";
import { setupCache } from "axios-cache-interceptor";
import { z } from "zod";
import { ADMIN_API_URL } from "../../pusher/enums/EnvironmentVariable";
import { GuardError } from "../types/GuardError";
import { AuthenticatorInterface } from "./AuthenticatorInterface";

const client = setupCache(axios);

const authorizationSuccessResponse = z.object({
    success: z.literal(true),
});

const authorizationErrorResponse = z.object({
    success: z.literal(false),
    error: z.union([
        z.literal("UNAUTHENTICATED"),
        z.literal("NOT_FOUND"),
        z.literal("PERMISSION_DENIED"),
        z.literal("INTERNAL"),
        z.literal("UNKNOWN"),
    ]),
    message: z.string(),
});

const authorizationResponse = z.union([authorizationSuccessResponse, authorizationErrorResponse]);

const authenticator: AuthenticatorInterface = async (apiKey, room) => {
    const encodedRoom = encodeURI(room);

    try {
        const rawResponse = await client.get<unknown>(ADMIN_API_URL + "/api/room-api/authorization", {
            cache: process.env.NODE_ENV === "production" ? undefined : false,
            id: `room-api-authorization-${encodedRoom}-${apiKey}`,
            headers: {
                "X-API-Key": apiKey,
            },
            params: {
                roomUrl: encodedRoom,
            },
        });

        const responseParsed = authorizationResponse.safeParse(rawResponse.data);
        if (!responseParsed.success) {
            console.error("Invalid response from the API for endpoint /api/room-api/authorization:", rawResponse);
            throw new GuardError(Status.INTERNAL, "Unexpected error! Please contact us!");
        }

        const response = responseParsed.data;

        if (response.success) {
            return;
        }

        if (response.error === "UNAUTHENTICATED") {
            throw new GuardError(Status.UNAUTHENTICATED, response.message);
        } else if (response.error === "NOT_FOUND") {
            throw new GuardError(Status.NOT_FOUND, response.message);
        } else if (response.error === "PERMISSION_DENIED") {
            throw new GuardError(Status.PERMISSION_DENIED, response.message);
        } else if (response.error === "INTERNAL") {
            throw new GuardError(Status.INTERNAL, response.message);
        } else if (response.error === "UNKNOWN") {
            throw new GuardError(Status.UNKNOWN, response.message);
        } else {
            const _exhaustiveCheck: never = response.error;
        }

        return;
    } catch (error) {
        if (error instanceof GuardError) {
            throw error;
        }

        if (isAxiosError(error) && error?.response?.data) {
            if (error.response.status === 400) {
                throw new GuardError(Status.UNKNOWN, String(error.response.data));
            } else if (error.response.status === 401) {
                throw new GuardError(Status.UNAUTHENTICATED, String(error.response.data));
            } else if (error.response.status === 404) {
                throw new GuardError(Status.NOT_FOUND, String(error.response.data));
            } else if (error.response.status === 403) {
                throw new GuardError(Status.PERMISSION_DENIED, String(error.response.data));
            } else if (error.response.status >= 500) {
                throw new GuardError(Status.INTERNAL, String(error.response.data));
            }

            throw new GuardError(Status.UNAUTHENTICATED, String(error.response.data));
        } else {
            console.error(error);
            throw new GuardError(Status.INTERNAL, "Internal error! Please contact us!");
        }
    }
};

export default authenticator;
