import { fetch } from "@workadventure/shared-utils/src/Fetch/nodeFetch";
import { MAP_STORAGE_API_TOKEN, WHITELISTED_RESOURCE_URLS } from "../Enum/EnvironmentVariable";

export async function fetchResourceUrl(input: string | URL, init?: RequestInit): Promise<Response> {
    const url = new URL(input.toString());

    if (!WHITELISTED_RESOURCE_URLS.includes(url.origin)) {
        throw new Error(`Unauthorized Resource URL: ${url.origin}`);
    }

    const headers = new Headers(init?.headers);
    if (MAP_STORAGE_API_TOKEN && !headers.has("Authorization")) {
        headers.set("Authorization", MAP_STORAGE_API_TOKEN);
    }

    return fetch(url, {
        ...init,
        headers,
    });
}

export async function readOptionalJson(response: Response): Promise<unknown | undefined> {
    const body = await response.text();
    if (body === "") {
        return undefined;
    }

    try {
        return JSON.parse(body) as unknown;
    } catch {
        return body;
    }
}
