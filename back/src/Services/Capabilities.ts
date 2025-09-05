import { Capabilities } from "@workadventure/messages";

let capabilities: Capabilities | undefined;

export function getCapabilities(): Capabilities {
    if (!capabilities) {
        throw Error("Capabilities have not been initialized");
    }
    return capabilities;
}
export function getCapability(key: keyof Capabilities): string | undefined {
    if (!capabilities) {
        throw Error("Capabilities have not been initialized");
    }
    return capabilities[key];
}

export function setCapabilities(_capabilities: Capabilities) {
    capabilities = _capabilities;
}
