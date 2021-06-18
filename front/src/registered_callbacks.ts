import type {IframeResponseEventMap} from "./Api/Events/IframeEvent";
import type {IframeCallback} from "./Api/iframe/IframeApiContribution";

export const registeredCallbacks: { [K in keyof IframeResponseEventMap]?: IframeCallback<K> } = {}
