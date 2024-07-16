import { AvailabilityStatus, OauthRefreshToken } from "@workadventure/messages";
import { Readable } from "svelte/store";

export interface ExtensionModuleOptions {
    workadventureStatusStore: Readable<AvailabilityStatus>;
    onExtensionModuleStatusChange?: (workAdventureNewStatus: AvailabilityStatus) => void;
    getOauthRefreshToken?: (tokenToRefresh: string) => Promise<OauthRefreshToken>;
}

export interface ExtensionModule {
    init: (roomMetadata: unknown, options?: ExtensionModuleOptions) => void;
    joinMeeting: () => void;
    destroy: () => void;
}
