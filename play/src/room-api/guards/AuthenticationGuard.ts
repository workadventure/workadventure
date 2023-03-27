import { Metadata } from "@grpc/grpc-js";
import { Status } from "@grpc/grpc-js/build/src/constants";
import { ADMIN_API_URL } from "../../pusher/enums/EnvironmentVariable";
import AdminAuthenticator from "../authentication/AdminAuthenticator";
import { AuthenticatorInterface } from "../authentication/AuthenticatorInterface";
import LocalAuthenticator from "../authentication/LocalAuthenticator";
import { GuardReturns } from "../types/GuardReturns";

export default async (metadata: Metadata, room: string): Promise<GuardReturns> => {
    const metadataValue = metadata.get("X-API-Key")[0];
    const apiKey = typeof metadataValue === "string" ? metadataValue : undefined;

    if (!apiKey) {
        return {
            success: false,
            code: Status.UNAUTHENTICATED,
            details: "X-API-Key metadata not defined!",
        };
    }

    const authenticator: AuthenticatorInterface = ADMIN_API_URL ? AdminAuthenticator : LocalAuthenticator;
    return await authenticator(apiKey, room);
};
