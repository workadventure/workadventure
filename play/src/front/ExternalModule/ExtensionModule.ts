import { AvailabilityStatus, ExternalModuleMessage, OauthRefreshToken } from "@workadventure/messages";
import { Readable, Updater } from "svelte/store";
import { CalendarEventInterface } from "@workadventure/shared-utils";
import { ComponentType } from "svelte";
import { AreaData, AreaDataProperties } from "@workadventure/map-editor";
import { Observable } from "rxjs";
import { z } from "zod";

export enum ExternalModuleStatus {
    ONLINE = "online",
    WARNING = "warning",
    SYNC = "sync",
    OFFLINE = "offline",
}

export interface ExtensionModuleOptions {
    workadventureStatusStore: Readable<AvailabilityStatus>;
    onExtensionModuleStatusChange?: (workAdventureNewStatus: AvailabilityStatus) => void;
    getOauthRefreshToken?: (tokenToRefresh: string) => Promise<OauthRefreshToken>;
    calendarEventsStoreUpdate?: (this: void, updater: Updater<Map<string, CalendarEventInterface>>) => void;
    userAccessToken: string;
    roomId: string;
    externalModuleMessage?: Observable<ExternalModuleMessage>;
    adminUrl?: string;
}

export interface ExtensionModuleAreaProperty {
    AreaPropertyEditor: ComponentType;
    AddAreaPropertyButton: ComponentType;
    handleAreaPropertyOnEnter: (area: AreaData) => void;
    handleAreaPropertyOnLeave: (area?: AreaData) => void;
    shouldDisplayButton: (areaProperties: AreaDataProperties) => boolean;
}

export interface ExtensionModule {
    init: (roomMetadata: RoomMetadataType, options?: ExtensionModuleOptions) => void;
    joinMeeting: () => void;
    destroy: () => void;
    areaMapEditor?: () => { [key: string]: ExtensionModuleAreaProperty } | undefined;
    statusStore?: Readable<ExternalModuleStatus>;
    checkModuleSynschronisation?: () => void;
    components?: () => ComponentType[];
    openPopupMeeting?: (
        subject: string,
        joinWebUrl: string,
        meetingId: string,
        startDateTime: Date,
        endDateTime: Date,
        passcode?: string
    ) => void;
}

export const RoomMetadataType = z.object({
    player: z.object({
        accessTokens: z.array(
            z.object({
                token: z.string(),
                provider: z.string(),
            })
        ),
    }),
    msteams: z.boolean(),
    teamsstings: z.object({
        communication: z.boolean(),
        status: z.boolean(),
        calendar: z.boolean(),
    }),
});

export type RoomMetadataType = z.infer<typeof RoomMetadataType>;
