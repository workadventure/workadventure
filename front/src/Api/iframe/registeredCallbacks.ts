import type { IframeResponseEventMap } from "../../Api/Events/IframeEvent";
import type { IframeCallback } from "../../Api/iframe/IframeApiContribution";
import type { IframeCallbackContribution } from "../../Api/iframe/IframeApiContribution";

export const registeredCallbacks: { [K in keyof IframeResponseEventMap]?: IframeCallback<K> } = {};

export function apiCallback<T extends keyof IframeResponseEventMap>(
    callbackData: IframeCallbackContribution<T>
): IframeCallbackContribution<keyof IframeResponseEventMap> {
    const iframeCallback = {
        typeChecker: callbackData.typeChecker,
        callback: callbackData.callback,
    } as IframeCallback<T>;

    const newCallback = { [callbackData.type]: iframeCallback };
    Object.assign(registeredCallbacks, newCallback);
    return callbackData as unknown as IframeCallbackContribution<keyof IframeResponseEventMap>;
}
