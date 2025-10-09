import axios from "axios";
import { asError } from "catch-unknown";
import { MAP_STORAGE_API_TOKEN, WHITELISTED_RESOURCE_URLS } from "../Enum/EnvironmentVariable";

export const _axios = axios.create({
    headers: {
        Authorization: MAP_STORAGE_API_TOKEN,
    },
});

_axios.interceptors.request.use(
    (config) => {
        const url = new URL(config.url || "");

        if (WHITELISTED_RESOURCE_URLS.includes(url.origin)) {
            return config;
        }

        return Promise.reject(new Error(`Unauthorized Resource URL: ${url.origin}`));
    },
    (error) => {
        return Promise.reject(asError(error));
    }
);
