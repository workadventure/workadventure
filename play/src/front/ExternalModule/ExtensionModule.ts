import { AvailabilityStatus, ExternalModuleMessage, OauthRefreshToken } from "@workadventure/messages";
import { Readable, Updater, Writable } from "svelte/store";
import { CalendarEventInterface, TodoListInterface } from "@workadventure/shared-utils";
import { ComponentType } from "svelte";
import { AreaData, AreaDataProperties } from "@workadventure/map-editor";
import { Observable } from "rxjs";
import { OpenCoWebsiteObject } from "../Chat/Utils";
import { SpaceRegistryInterface } from "../Space/SpaceRegistry/SpaceRegistryInterface";
import { ExternalComponentZones } from "../Stores/Utils/externalSvelteComponentService";

export interface ExternalSvelteComponentServiceInterface {
    addComponentToZone(
        zone: ExternalComponentZones,
        key: string,
        extensionModule: ExtensionModule,
        componentType: ComponentType
    ): void;
    removeComponentFromZone(zone: ExternalComponentZones, key: string): void;
}

export interface ExtensionModuleOptions {
    workadventureStatusStore: Readable<AvailabilityStatus>;
    userAccessToken: string;
    roomId: string;
    externalModuleMessage: Observable<ExternalModuleMessage>;
    externalSvelteComponent: ExternalSvelteComponentServiceInterface;
    externalRestrictedMapEditorProperties?: Writable<string[]>;
    onExtensionModuleStatusChange: (workAdventureNewStatus: AvailabilityStatus) => void;
    openCoWebSite: (openCoWebsiteObject: OpenCoWebsiteObject, source: MessageEventSource | null) => { id: string };
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
