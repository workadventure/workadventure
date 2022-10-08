export enum AdminCapability {
    CompanionsList = "api/companion/list",
}

export interface AdminCapabilities {
    has(capability: AdminCapability): boolean;
}
