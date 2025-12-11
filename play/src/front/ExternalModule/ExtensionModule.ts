import type { AvailabilityStatus, ExternalModuleMessage, OauthRefreshToken } from "@workadventure/messages";
import type { Readable, Updater, Writable } from "svelte/store";
import type { CalendarEventInterface, TodoListInterface } from "@workadventure/shared-utils";
import type { ComponentProps, ComponentType, SvelteComponentTyped } from "svelte";
import type { AreaData, AreaDataProperties } from "@workadventure/map-editor";
import type { Observable } from "rxjs";
import { z } from "zod";
import type { OpenCoWebsiteObject } from "../Chat/Utils";
import type { SpaceRegistryInterface } from "../Space/SpaceRegistry/SpaceRegistryInterface";
import type { ExternalComponentZones } from "../Stores/Utils/externalSvelteComponentService";
import type { HasPlayerMovedInterface } from "../Api/Events/HasPlayerMovedInterface";

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
    handleAreaPropertyOnEnter: (area: AreaData, signal: AbortSignal) => void;
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
                        scopes: z
                            .string()
                            .optional()
                            .nullable()
                            .describe("Scopes associated with the token, separated by spaces"),
                    })
                )
                .optional(),
        })
        .optional(),
    modules: z.string().array(),
});

export type RoomMetadataType = z.infer<typeof RoomMetadataType>;
