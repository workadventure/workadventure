import { AvailabilityStatus, ExternalModuleMessage, OauthRefreshToken } from "@workadventure/messages";
import { Readable, Updater } from "svelte/store";
import { CalendarEventInterface } from "@workadventure/shared-utils";
import { ComponentType } from "svelte";
import { AreaData, AreaDataProperties } from "@workadventure/map-editor";
import { Observable } from "rxjs";
import { z } from "zod";
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
    onExtensionModuleStatusChange: (workAdventureNewStatus: AvailabilityStatus) => void;
    calendarEventsStoreUpdate: (this: void, updater: Updater<Map<string, CalendarEventInterface>>) => void;
    openCoWebSite: (
        openCoWebsiteObject: OpenCoWebsiteObject,
        source: MessageEventSource | null
    ) => Promise<{ id: string }>;
    closeCoWebsite: (id: string) => unknown;
    adminUrl?: string;
    getOauthRefreshToken?: (tokenToRefresh: string) => Promise<OauthRefreshToken>;
    spaceRegistry?: SpaceRegistryInterface;
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
    init: (roomMetadata: RoomMetadataType, options: ExtensionModuleOptions) => void;
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
}

export const RoomMetadataType = z.object({
    player: z.object({
        accessTokens: z.array(
            z.object({
                token: z.string(),
                provider: z.string(),
            })
        ).optional(),
    }).optional(),
    modules: z.enum(["ms-teams"]).array(),
    msTeamsSettings: z.object({
        communication: z.boolean(),
        status: z.boolean(),
        calendar: z.boolean(),
    }),
});

export type RoomMetadataType = z.infer<typeof RoomMetadataType>;
