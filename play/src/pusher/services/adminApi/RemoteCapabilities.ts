import type { AdminCapabilities } from "./AdminCapabilities";
import { AdminCapability } from "./AdminCapabilities";

export class RemoteCapabilities implements AdminCapabilities {
    constructor(private capabilities: Map<string, string> = new Map<string, string>()) {
        // currently, admin api MUST implement woka list
        capabilities.set(AdminCapability.WokaList, "v1");
    }

    has(capability: AdminCapability): boolean {
        return this.capabilities.has(capability);
    }

    info(): string {
        return JSON.stringify(Object.fromEntries(this.capabilities), null, 2);
    }
}
