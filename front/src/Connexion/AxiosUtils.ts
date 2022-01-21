import axios from "axios";
import * as rax from "retry-axios";
import { errorStore } from "../Stores/ErrorStore";
import LL from "../i18n/i18n-svelte";
import { get } from "svelte/store";

/**
 * This instance of Axios will retry in case of an issue and display an error message as a HTML overlay.
 */
export const axiosWithRetry = axios.create();
axiosWithRetry.defaults.raxConfig = {
    instance: axiosWithRetry,
    retry: Infinity,
    noResponseRetries: Infinity,

    maxRetryAfter: 60_000,

    statusCodesToRetry: [
        [100, 199],
        [429, 429],
        [501, 599],
    ],

    // You can detect when a retry is happening, and figure out how many
    // retry attempts have been made
    onRetryAttempt: (err) => {
        const cfg = rax.getConfig(err);
        console.log(err);
        console.log(cfg);
        console.log(`Retry attempt #${cfg?.currentRetryAttempt} on URL '${err.config.url}'`);
        errorStore.addErrorMessage(get(LL).error.connectionRetry.unableConnect(), {
            closable: false,
            id: "axios_retry",
        });
    },
};

axiosWithRetry.interceptors.response.use((res) => {
    if (res.status < 400) {
        errorStore.clearMessageById("axios_retry");
    }
    return res;
});

const interceptorId = rax.attach(axiosWithRetry);
