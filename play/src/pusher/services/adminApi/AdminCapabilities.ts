export enum AdminCapability {
    CompanionsList = "api/companion/list",
    WokaList = "api/woka/list",
}

export interface AdminCapabilities {
    has(capability: AdminCapability): boolean;

    info(): string;
}
