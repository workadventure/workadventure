import { Status } from "@grpc/grpc-js/build/src/constants";
import { FRONT_URL, ROOM_API_SECRET_KEY } from "../../pusher/enums/EnvironmentVariable";
import { GuardError } from "../types/GuardError";
import { AuthenticatorInterface } from "./AuthenticatorInterface";

const authenticator: AuthenticatorInterface = (apiKey, room) => {
    return new Promise((resolve, reject) => {
        if (apiKey !== ROOM_API_SECRET_KEY) {
            reject(new GuardError(Status.UNAUTHENTICATED, "Wrong API key"));
            return;
        }

        if (FRONT_URL !== "/" && !room.startsWith(FRONT_URL)) {
            reject(new GuardError(Status.PERMISSION_DENIED, "You cannot interact with this room!"));
            return;
        }

        resolve();
        return;
    });
};

export default authenticator;
