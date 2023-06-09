import { Status } from "@grpc/grpc-js/build/src/constants";
import axios, { isAxiosError } from "axios";
import { setupCache } from "axios-cache-interceptor";
import { ADMIN_API_URL } from "../../pusher/enums/EnvironmentVariable";
import { GuardError } from "../types/GuardError";
import { AuthenticatorInterface } from "./AuthenticatorInterface";

const client = setupCache(axios);

const authenticator: AuthenticatorInterface = async (apiKey, room) => {
    const encodedRoom = encodeURI(room);

    try {
        const response = await client.get(ADMIN_API_URL + "/api/room-api/authorization", {
            cache: process.env.NODE_ENV === "production" ? undefined : false,
            id: `room-api-authorization-${encodedRoom}-${apiKey}`,
            headers: {
                "X-API-Key": apiKey,
            },
            params: {
                roomUrl: encodedRoom,
            },
        });

        if (!response.data.success) {
            console.error("Weird response from the API:", response);
            throw new GuardError(Status.INTERNAL, "Unexpected error! Please contact us!");
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
