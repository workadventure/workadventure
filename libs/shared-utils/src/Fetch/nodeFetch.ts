import { Agent, interceptors } from "undici";
import { assertResponseOk, HttpError } from "./fetchUtils";

type NodeFetchInput = string | URL;

type NodeFetchInit = Omit<RequestInit, "dispatcher"> & {
    dispatcher?: unknown;
};

const dnsCachedDispatcher = new Agent().compose([
    interceptors.dns({
        maxTTL: 10_000,
        maxItems: 1_000,
    }),
]);

/**
 * Node-only fetch wrapper backed by an Undici dispatcher with a small DNS cache.
 *
 * This function:
 * - reuses a shared dispatcher configured with DNS caching
 * - forwards the request to the runtime fetch implementation
 * - throws {@link HttpError} for non-2xx responses
 *
 * It is intended for server-side callers that want `fetch` semantics while
 * treating HTTP error responses the same way axios used to be treated.
 */
export async function fetch(input: NodeFetchInput, init?: RequestInit): Promise<Response> {
    const requestInit: NodeFetchInit = {
        ...init,
        dispatcher: dnsCachedDispatcher,
    };

    return assertResponseOk(
        await (globalThis.fetch as (input: NodeFetchInput, init?: NodeFetchInit) => Promise<Response>)(
            input,
            requestInit
        )
    );
}

export { HttpError };
