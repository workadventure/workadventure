import { AvailabilityStatus, ExternalModuleMessage, OauthRefreshToken } from "@workadventure/messages";
import { Readable, Updater, Writable } from "svelte/store";
import { CalendarEventInterface, TodoListInterface } from "@workadventure/shared-utils";
import { ComponentProps, ComponentType, SvelteComponentTyped } from "svelte";
import { AreaData, AreaDataProperties } from "@workadventure/map-editor";
import { Observable } from "rxjs";
import { z } from "zod";
import { OpenCoWebsiteObject } from "../Chat/Utils";
import { SpaceRegistryInterface } from "../Space/SpaceRegistry/SpaceRegistryInterface";
import { ExternalComponentZones } from "../Stores/Utils/externalSvelteComponentService";
import { HasPlayerMovedInterface } from "../Api/Events/HasPlayerMovedInterface";

export interface ExternalSvelteComponentServiceInterface {
    addComponentToZone<Component extends SvelteComponentTyped>(
        zone: ExternalComponentZones,
        key: string,
        componentType: ComponentType<Component>,
        props?: ComponentProps<Component>
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
    openErrorScreen?(error: Error): void;
    logoutCallback?(): void;
    showComponentInChat(component: ComponentType, props?: Record<string, unknown>): void;
    onPlayerMovementEnded?: (callback: (event: HasPlayerMovedInterface) => void) => void;
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

export const RoomMetadataType = z.object({
    player: z
        .object({
            accessTokens: z
                .array(
                    z.object({
                        token: z.string(),
                        provider: z.string(),
                    })
                )
                .optional(),
        })
        .optional(),
    modules: z.string().array(),
});

export type RoomMetadataType = z.infer<typeof RoomMetadataType>;
