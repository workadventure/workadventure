import { writable } from "svelte/store";
import { ErrorScreenMessage } from "@workadventure/messages";
import Axios from "axios";
import { ApiError } from "./Errors/ApiError";

/**
 * A store that contains one error of type WAError to be displayed.
 */
function createErrorScreenStore() {
    const { subscribe, set } = writable<ErrorScreenMessage | undefined>(undefined);

    return {
        subscribe,
        setError: (e: ErrorScreenMessage): void => {
            set(e);
        },
        /**
         * Turns an exception into an error.
         */
        setException: (error: unknown): void => {
            console.error(error);
            if (error instanceof Error) {
                console.error("Stacktrace: ", error.stack);
            }
            console.trace();

            if (typeof error === "string" || error instanceof String) {
                set(
                    ErrorScreenMessage.fromPartial({
                        type: "error",
                        code: "INTERNAL_ERROR",
                        title: "An error occurred",
                        details: error.toString(),
                    })
                );
                return;
            }
            if (Axios.isAxiosError(error) && error.response) {
                // Axios HTTP error
                // client received an error response (5xx, 4xx)
                console.error("Axios error. Request:", error.request, " - Response: ", error.response);

                set(
                    ErrorScreenMessage.fromPartial({
                        type: "error",
                        code: "HTTP_ERROR",
                        title:
                            "HTTP " +
                            error.response.status +
                            " - " +
                            (error.response.data ? error.response.data : error.response.statusText),
                        details: "An error occurred while accessing URL: " + error.response.config?.url,
                    })
                );
                return;
            }
            if (Axios.isAxiosError(error)) {
                // Axios HTTP error
                // client never received a response, or request never left
                console.error("Axios error. No full HTTP response received. Request to URL:", error.config?.url);
                set(
                    ErrorScreenMessage.fromPartial({
                        type: "error",
                        code: "NETWORK_ERROR",
                        title: "Network error",
                        subtitle: error.message,
                    })
                );
                return;
            }
            if (error instanceof ApiError) {
                const errorApi = error.errorApiData;

                if (errorApi.type === "error" || errorApi.type === "redirect") {
                    set(ErrorScreenMessage.fromPartial(errorApi));
                } else if (errorApi.type === "retry" || errorApi.type === "unauthorized") {
                    set(
                        ErrorScreenMessage.fromPartial({
                            ...errorApi,
                            buttonTitle: errorApi.buttonTitle ?? undefined,
                        })
                    );
                } else {
                    const _exhaustiveCheck: never = errorApi;
                }
                return;
            }
            if (error instanceof Error) {
                // Error
                set(
                    ErrorScreenMessage.fromPartial({
                        type: "error",
                        code: "INTERNAL_ERROR",
                        title: "An error occurred",
                        subtitle: error.name,
                        details: error.message,
                    })
                );
                return;
            }
            throw error;
        },
        delete: () => {
            set(undefined);
        },
    };
}

export const errorScreenStore = createErrorScreenStore();
