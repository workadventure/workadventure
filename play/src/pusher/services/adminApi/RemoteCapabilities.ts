import {AdminCapabilities, AdminCapability} from "./AdminCapabilities";

export class RemoteCapabilities implements AdminCapabilities {
    constructor(private capabilities: Map<string, string> = new Map<string, string>()) {
    }

    has(capability: AdminCapability): boolean {
        return this.capabilities.has(capability)
    }
}
