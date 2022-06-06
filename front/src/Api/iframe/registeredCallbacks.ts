import { IframeResponseEvent } from "../../Api/Events/IframeEvent";

export const registeredCallbacks: {
    [K in IframeResponseEvent["type"]]?: (event: Extract<IframeResponseEvent, { type: K }>["data"]) => void;
} = {};

export function apiCallback<T extends IframeResponseEvent["type"]>(callbackData: {
    type: T;
    callback: (event: Extract<IframeResponseEvent, { type: T }>["data"]) => void;
}): {
    type: T;
    callback: (event: Extract<IframeResponseEvent, { type: T }>["data"]) => void;
} {
    // @ts-ignore
    registeredCallbacks[callbackData.type] = callbackData.callback;

    // @ts-ignore
    return callbackData;
}
