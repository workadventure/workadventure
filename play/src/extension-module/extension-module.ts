import { AvailabilityStatus, OauthRefreshToken } from "@workadventure/messages";
import { Readable, Updater } from "svelte/store";
import { CalendarEventInterface } from "@workadventure/shared-utils";
import { ComponentType } from "svelte";
import { AreaData } from "@workadventure/map-editor";

export interface ExtensionModuleOptions {
    workadventureStatusStore: Readable<AvailabilityStatus>;
    onExtensionModuleStatusChange?: (workAdventureNewStatus: AvailabilityStatus) => void;
    getOauthRefreshToken?: (tokenToRefresh: string) => Promise<OauthRefreshToken>;
    calendarEventsStoreUpdate?: (this: void, updater: Updater<Map<string, CalendarEventInterface>>) => void;
}

export interface ExtensionModule {
    init: (roomMetadata: unknown, options?: ExtensionModuleOptions) => void;
    destroy: () => void;
    areaMapEditor?: () => {
        AreaPropertyEditor: ComponentType;
        AddAreaPropertyButton: ComponentType;
        handleAreaPropertyOnEnter: (area: AreaData) => void;
        handleAreaPropertyOnLeave: () => void;
    };
}
