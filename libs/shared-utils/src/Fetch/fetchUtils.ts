const MAX_HTTP_ERROR_BODY_LENGTH = 2_048;

function trimHttpErrorBody(body: string): string {
    return body.slice(0, MAX_HTTP_ERROR_BODY_LENGTH);
}

export class HttpError extends Error {
    public readonly body: string;
    public readonly fullBody: string;

    constructor(
        public readonly status: number,
        public readonly statusText: string,
        public readonly url: string,
        fullBody: string
    ) {
        super(`Request failed with status ${status}${statusText ? ` ${statusText}` : ""}`);
        this.name = "HttpError";
        this.body = trimHttpErrorBody(fullBody);
        this.fullBody = fullBody;
    }
}

export async function assertResponseOk<T extends Response>(response: T): Promise<T> {
    if (response.ok) {
        return response;
    }

    throw new HttpError(response.status, response.statusText, response.url, await response.clone().text());
}
