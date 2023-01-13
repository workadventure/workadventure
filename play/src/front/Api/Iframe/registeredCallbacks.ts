import type { IframeResponseEvent } from "../Events/IframeEvent";

export const registeredCallbacks: {
    [K in IframeResponseEvent["type"]]?: ((event: Extract<IframeResponseEvent, { type: K }>["data"]) => void)[];
} = {};

export function apiCallback<T extends IframeResponseEvent["type"]>(callbackData: {
    type: T;
    callback: (event: Extract<IframeResponseEvent, { type: T }>["data"]) => void;
}): {
    type: T;
    callback: (event: Extract<IframeResponseEvent, { type: T }>["data"]) => void;
} {
    if (registeredCallbacks[callbackData.type] === undefined) {
        registeredCallbacks[callbackData.type] = [];
    }
    // TODO: we probably need to reverse the way this works, like in IframeListener, with a class exposing streams of observers
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    registeredCallbacks[callbackData.type].push(callbackData.callback);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return callbackData;
}
