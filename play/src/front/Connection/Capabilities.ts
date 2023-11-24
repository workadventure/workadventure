import { Capabilities } from "@workadventure/messages";

declare global {
    interface Window {
        capabilities: Capabilities;
    }
}

export function hasCapability<T extends keyof Capabilities>(capability: T): Capabilities[T] {
    return window.capabilities[capability];
}
