import { readable, writable } from "svelte/store";
import {
    ErrorApiErrorData,
    ErrorApiRetryData,
    ErrorApiUnauthorizedData,
    ErrorScreenMessage,
    isErrorApiErrorData,
    isErrorApiRetryData,
    isErrorApiUnauthorizedData,
} from "@workadventure/messages";
import { isAxiosError } from "axios";

import logoImg from "../Components/images/logo-min-white.png";
import errorGif from "../Components/UI/images/error.gif";
import { ApiError } from "./Errors/ApiError";

const errorLogo = new Image();
errorLogo.src = logoImg;
export const errorLogoStore = readable<HTMLImageElement>(errorLogo);

const errorImage = new Image();
errorImage.src = errorGif;
export const errorImageStore = readable<HTMLImageElement>(errorImage);

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
        setErrorFromApi: (e: ErrorApiErrorData | ErrorApiRetryData | ErrorApiUnauthorizedData): void => {
            const errorApiErrorData = isErrorApiErrorData.safeParse(e);
            if (errorApiErrorData.success) {
                const error = errorApiErrorData.data;

                set({
                    type: "error",
                    code: error.code,
                    title: error.title,
                    subtitle: error.subtitle,
                    details: error.details,
                    image: error.image,
                    imageLogo: error.imageLogo,
                    timeToRetry: undefined,
                    buttonTitle: undefined,
                    canRetryManual: undefined,
                    urlToRedirect: undefined,
                });
                return;
            }
            const errorApiRetryData = isErrorApiRetryData.safeParse(e);
            if (errorApiRetryData.success) {
                const error = errorApiRetryData.data;
                set({
                    type: "retry",
                    code: error.code,
                    title: error.title,
                    subtitle: error.subtitle,
                    details: error.details,
                    image: error.image,
                    imageLogo: error.imageLogo,
                    timeToRetry: error.timeToRetry,
                    buttonTitle: error.buttonTitle ?? undefined,
                    canRetryManual: error.canRetryManual,
                    urlToRedirect: undefined,
                });
                return;
            }
            const errorApiUnauthorizedData = isErrorApiUnauthorizedData.safeParse(e);
            if (errorApiUnauthorizedData.success) {
                const error = errorApiUnauthorizedData.data;
                set({
                    type: "unauthorized",
                    code: error.code,
                    title: error.title,
                    subtitle: error.subtitle,
                    details: error.details,
                    image: error.image,
                    imageLogo: error.imageLogo,
                    timeToRetry: undefined,
                    buttonTitle: error.buttonTitle ?? undefined,
                    canRetryManual: undefined,
                    urlToRedirect: undefined,
                });
                return;
            }
            throw new Error("This should never happen.");
        },
        /**
         * Turns an exception into an error.
         */
        setException: (error: unknown): void => {
            console.error(error);
            if (error instanceof Error) {
                console.error("Stacktrace: ", error.stack);
            }

            if (typeof error === "string" || error instanceof String) {
                set(
                    ErrorScreenMessage.fromPartial({
                        image: "/resources/icons/new_version.png",
                        imageLogo: "/static/images/logo.png",
                        type: "error",
                        code: "INTERNAL_ERROR",
                        title: "An error occurred",
                        details: error.toString(),
                    })
                );
                return;
            }
            if (isAxiosError(error) && error.response) {
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
                        details: "An error occurred while accessing URL: " + error.config?.url,
                    })
                );
                return;
            }
            if (isAxiosError(error)) {
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
                const { status: _exhaustiveCheck, ...errorApiWithoutStatus } = errorApi;

                switch (errorApiWithoutStatus.type) {
                    case "error":
                    case "redirect": {
                        set(ErrorScreenMessage.fromPartial(errorApiWithoutStatus));
                        return;
                    }
                    case "retry":
                    case "unauthorized": {
                        set(
                            ErrorScreenMessage.fromPartial({
                                ...errorApiWithoutStatus,
                                buttonTitle: errorApiWithoutStatus.buttonTitle ?? undefined,
                            })
                        );
                        return;
                    }
                    default: {
                        // @ts-ignore Typescript compiler is lost because of the removal of the status field.
                        const _exhaustiveCheck: never = errorApi;
                        throw new Error("This should never happen.");
                    }
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
