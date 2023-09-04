import axios, { AxiosError, AxiosRequestConfig } from "axios";
import axiosRetry, { isNetworkOrIdempotentRequestError, exponentialDelay } from "axios-retry";
import { get } from "svelte/store";
import { errorStore } from "../Stores/ErrorStore";
import { LL } from "../../i18n/i18n-svelte";
import { ABSOLUTE_PUSHER_URL } from "../Enum/ComputedConst";

export const axiosToPusher = axios.create({
    baseURL: ABSOLUTE_PUSHER_URL,
});

/**
 * This instance of Axios will retry in case of an issue and display an error message as a HTML overlay.
 */
export const axiosWithRetry = axios.create({
    baseURL: ABSOLUTE_PUSHER_URL,
});

axiosRetry(axiosWithRetry, {
    retryDelay: (retryCount: number) => {
        const time = exponentialDelay(retryCount);
        if (time >= 60_000) {
            return 60_000;
        }
        return time;
    },
    retryCondition: (error: AxiosError) => {
        if (isNetworkOrIdempotentRequestError(error)) {
            return true;
        }

        return error.code !== "ECONNABORTED" && (!error.response || error.response.status == 429);
    },
    onRetry: (retryCount, error: AxiosError, requestConfig: AxiosRequestConfig) => {
        console.info(`Retry attempt #${retryCount} on URL '${requestConfig.url}':`, error.message);
        showConnectionIssueMessage();
    },
});

axiosWithRetry.interceptors.response.use(
    (res) => {
        hideConnectionIssueMessage();
        return res;
    },
    (error) => {
        // Do not clear error message if the status code is being retried.
        if ((error.status >= 500 && error.status <= 599) || error.status === 429) {
            return Promise.reject(error);
        }

        hideConnectionIssueMessage();
        return Promise.reject(error);
    }
);

export function showConnectionIssueMessage() {
    errorStore.addErrorMessage(get(LL).error.connectionRetry.unableConnect(), {
        closable: false,
        id: "axios_retry",
    });
}

export function hideConnectionIssueMessage() {
    errorStore.clearMessageById("axios_retry");
}
