import { Status } from "@grpc/grpc-js/build/src/constants";
import { PUSHER_URL, ROOM_API_SECRET_KEY } from "../../pusher/enums/EnvironmentVariable";
import { AuthenticatorInterface } from "./AuthenticatorInterface";

const authenticator: AuthenticatorInterface = (apiKey, room) => {
    return new Promise((resolve) => {
        if (apiKey !== ROOM_API_SECRET_KEY) {
            return resolve({
                success: false,
                code: Status.UNAUTHENTICATED,
                details: "Wrong API key",
            });
        }

        if (!room.startsWith(PUSHER_URL)) {
            return resolve({
                success: false,
                code: Status.PERMISSION_DENIED,
                details: "You cannot interact with this room!",
            });
        }

        return resolve({ success: true });
    });
};

export default authenticator;
