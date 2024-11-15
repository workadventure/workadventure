import { AvailabilityStatus, ExternalModuleMessage, OauthRefreshToken } from "@workadventure/messages";
import { Readable, Updater, Writable } from "svelte/store";
import { CalendarEventInterface, TodoListInterface } from "@workadventure/shared-utils";
import { ComponentType } from "svelte";
import { AreaData, AreaDataProperties } from "@workadventure/map-editor";
import { Observable } from "rxjs";
import { OpenCoWebsiteObject } from "../Chat/Utils";
import { SpaceRegistryInterface } from "../Space/SpaceRegistry/SpaceRegistryInterface";

export interface ExternalSvelteComponentStore {
    addActionBarComponent: (key: string, externsionModule: ExtensionModule, componentType: ComponentType) => void;
    removeActionBarComponent: (key: string) => void;
    addAvailibilityStatusComponent: (
        key: string,
        externsionModule: ExtensionModule,
        componentType: ComponentType
    ) => void;
    removeAvailibilityStatusComponent: (key: string) => void;
    addPopupComponent: (key: string, externsionModule: ExtensionModule, componentType: ComponentType) => void;
    removePopupComponent: (key: string) => void;
}

export interface ExtensionModuleOptions {
    workadventureStatusStore: Readable<AvailabilityStatus>;
    userAccessToken: string;
    roomId: string;
    externalModuleMessage: Observable<ExternalModuleMessage>;
    externalSvelteComponent: Readable<ExternalSvelteComponentStore>;
    externalRestrictedMapEditorProperties?: Writable<string[]>;
    onExtensionModuleStatusChange: (workAdventureNewStatus: AvailabilityStatus) => void;
    openCoWebSite: (
        openCoWebsiteObject: OpenCoWebsiteObject,
        source: MessageEventSource | null
    ) => Promise<{ id: string }>;
    closeCoWebsite: (id: string) => unknown;
    adminUrl?: string;
    getOauthRefreshToken?: (tokenToRefresh: string) => Promise<OauthRefreshToken>;
    spaceRegistry?: SpaceRegistryInterface;
    calendarEventsStoreUpdate?: (this: void, updater: Updater<Map<string, CalendarEventInterface>>) => void;
    todoListStoreUpdate?: (this: void, updater: Updater<Map<string, TodoListInterface>>) => void;
    logoutCallback?(): void;
}

export interface ExtensionModuleAreaProperty {
    AreaPropertyEditor: ComponentType;
    AddAreaPropertyButton: ComponentType;
    handleAreaPropertyOnEnter: (area: AreaData) => void;
    handleAreaPropertyOnLeave: (area?: AreaData) => void;
    shouldDisplayButton: (areaProperties: AreaDataProperties) => boolean;
}

export interface ExtensionModule {
    id: string;
    init: (roomMetadata: unknown, options: ExtensionModuleOptions) => void;
    joinMeeting: () => void;
    destroy: () => void;
    areaMapEditor?: () => { [key: string]: ExtensionModuleAreaProperty } | undefined;
    components?: () => ComponentType[];
    openPopupMeeting?: (
        subject: string,
        joinWebUrl: string,
        meetingId: string,
        startDateTime: Date,
        endDateTime: Date,
        passcode?: string
    ) => void;
    calendarSynchronised: boolean;
    todoListSynchronized: boolean;
}
