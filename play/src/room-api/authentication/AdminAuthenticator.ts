import { Status } from "@grpc/grpc-js/build/src/constants";
import axios, { isAxiosError } from "axios";
import { ADMIN_API_URL } from "../../pusher/enums/EnvironmentVariable";
import { AuthenticatorInterface } from "./AuthenticatorInterface";

const authenticator: AuthenticatorInterface = async (apiKey, room) => {
    try {
        const response = await axios.get(ADMIN_API_URL + "/api/room-api/authorization", {
            headers: {
                "X-API-Key": apiKey,
            },
            params: {
                roomUrl: encodeURI(room),
            },
        });

        if (response.status !== 200 || response.data.success) {
            console.error("Weird response from the API:", response);
            return {
                success: false,
                code: Status.UNAUTHENTICATED,
                details: "Unexpected error! Please contact us!",
            };
        }

        return { success: true };
    } catch (error) {
        if (isAxiosError(error) && error?.response?.data.error) {
            return {
                success: false,
                code: Status.UNAUTHENTICATED,
                details: error.response.data.error,
            };
        } else {
            console.error(error);
            return {
                success: false,
                code: Status.UNAUTHENTICATED,
                details: "Internal Error! Please contact us!",
            };
        }
    }
};

export default authenticator;
