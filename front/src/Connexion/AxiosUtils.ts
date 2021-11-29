import axios from "axios";
import * as rax from "retry-axios";
import {errorStore} from "../Stores/ErrorStore";

/**
 * This instance of Axios will retry in case of an issue and display an error message as a HTML overlay.
 */
export const axiosWithRetry = axios.create();
axiosWithRetry.defaults.raxConfig = {
    instance: axiosWithRetry,
    retry: Infinity,
    noResponseRetries: Infinity,

    maxRetryAfter: 60_000,

    // You can detect when a retry is happening, and figure out how many
    // retry attempts have been made
    onRetryAttempt: err => {
        const cfg = rax.getConfig(err);
        console.log(err)
        console.log(cfg)
        console.log(`Retry attempt #${cfg?.currentRetryAttempt}`);
        errorStore.addErrorMessage('Unable to connect to WorkAdventure. Are you connected to internet?', {
            closable: false,
            id: "axios_retry"
        });
    },
};

axiosWithRetry.interceptors.response.use(res => {
    if (res.status < 400) {
        errorStore.clearMessageById("axios_retry");
    }
    return res;
});

const interceptorId = rax.attach(axiosWithRetry);
