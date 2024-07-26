import { AvailabilityStatus, ExternalModuleMessage, OauthRefreshToken } from "@workadventure/messages";
import { Readable, Updater } from "svelte/store";
import { CalendarEventInterface } from "@workadventure/shared-utils";
import { ComponentType } from "svelte";
import { AreaData, AreaDataProperties } from "@workadventure/map-editor";
import { Observable } from "rxjs";

export interface ExtensionModuleOptions {
    workadventureStatusStore: Readable<AvailabilityStatus>;
    onExtensionModuleStatusChange?: (workAdventureNewStatus: AvailabilityStatus) => void;
    getOauthRefreshToken?: (tokenToRefresh: string) => Promise<OauthRefreshToken>;
    calendarEventsStoreUpdate?: (this: void, updater: Updater<Map<string, CalendarEventInterface>>) => void;
    userAccessToken: string;
    roomId: string;
    externalModuleMessage?: Observable<ExternalModuleMessage>;
}

export interface ExtensionModuleAreaProperty {
    AreaPropertyEditor: ComponentType;
    AddAreaPropertyButton: ComponentType;
    handleAreaPropertyOnEnter: (area: AreaData) => void;
    handleAreaPropertyOnLeave: () => void;
    shouldDisplayButton: (areaProperties: AreaDataProperties) => boolean;
}

export interface ExtensionModule {
    init: (roomMetadata: unknown, options?: ExtensionModuleOptions) => void;
    joinMeeting: () => void;
    destroy: () => void;
    areaMapEditor?: () => { [key: string]: ExtensionModuleAreaProperty };
}
