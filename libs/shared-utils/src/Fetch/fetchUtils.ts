export class HttpError extends Error {
    constructor(
        public readonly status: number,
        public readonly statusText: string,
        public readonly url: string,
        public readonly body: string
    ) {
        super(`Request failed with status ${status}${statusText ? ` ${statusText}` : ""}`);
        this.name = "HttpError";
    }
}

export async function assertResponseOk<T extends Response>(response: T): Promise<T> {
    if (response.ok) {
        return response;
    }

    throw new HttpError(response.status, response.statusText, response.url, await response.clone().text());
}
