import {AdminCapabilities, AdminCapability} from "./AdminCapabilities";

export class LocalCapabilities implements AdminCapabilities {
    has(_capability: AdminCapability): boolean {
        return false;
    }
}
