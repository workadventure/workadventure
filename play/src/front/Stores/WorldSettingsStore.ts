import { writable } from "svelte/store";
import { filter, firstValueFrom, timeout } from "rxjs";
import type { Observable } from "rxjs";
import {
    type ResolvedMegaphone,
    WAMSettingsUtils,
    WORLD_SETTINGS_FILE_NAME,
    WORLD_SETTINGS_REVISION_METADATA_KEY,
    WorldSettings,
} from "@workadventure/map-editor";
import type { EditMapCommandMessage } from "@workadventure/messages";
import type { SpaceInterface } from "../Space/SpaceInterface";
import { getMapStorageRootUrl } from "../Utils/MapStorageUrl";
import type { MegaphoneSpaceSettings } from "./MegaphoneStore";

/** The settings shared by every map of the world, as stored in the map-storage. */
export const worldSettingsStore = writable<WorldSettings | undefined>(undefined);

/** The world settings live next to the WAM files, at the root of the map-storage domain. */
export function getWorldSettingsUrl(wamUrl: string, mapStoragePrefix: string | undefined): URL {
    return new URL(WORLD_SETTINGS_FILE_NAME, getMapStorageRootUrl(wamUrl, mapStoragePrefix));
}

export async function fetchWorldSettings(wamUrl: string, mapStoragePrefix: string | undefined): Promise<WorldSettings> {
    const response = await fetch(getWorldSettingsUrl(wamUrl, mapStoragePrefix), { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Could not load the world settings: HTTP ${response.status}`);
    }
    return WorldSettings.parse(await response.json());
}

export interface SaveWorldSettingsDeps {
    emit: (commandId: string, settings: WorldSettings) => void;
    editMapCommandMessageStream: Observable<EditMapCommandMessage>;
    /** The space every user of the world is in: its metadata tells them to re-read the settings. */
    worldSpace: SpaceInterface;
}

/**
 * Saves the world settings, then tells every connected user of the world to re-read them.
 * The ping carries no settings: each client reads them from the map-storage, the only source,
 * so no client can make the others apply settings that were not saved.
 */
export async function saveWorldSettings(settings: WorldSettings, deps: SaveWorldSettingsDeps): Promise<void> {
    const commandId = crypto.randomUUID();
    const answer = firstValueFrom(
        deps.editMapCommandMessageStream.pipe(
            filter((message) => message.id === commandId),
            timeout(20_000),
        ),
    );
    deps.emit(commandId, settings);
    const message = (await answer).editMapMessage?.message;
    if (message?.$case === "errorCommandMessage") {
        throw new Error(message.errorCommandMessage.reason);
    }
    deps.worldSpace.emitUpdateSpaceMetadata(new Map([[WORLD_SETTINGS_REVISION_METADATA_KEY, commandId]]));
}

/** What the megaphone stores hold for the megaphone in effect on this map. */
export function getMegaphoneStoreValues(
    resolved: ResolvedMegaphone | undefined,
    tags: string[],
    isLogged: boolean,
): { spaceSettings: MegaphoneSpaceSettings | undefined; canBeUsed: boolean } {
    if (!resolved) {
        return { spaceSettings: undefined, canBeUsed: false };
    }
    const megaphone = resolved.settings.megaphone;
    return {
        spaceSettings: {
            spaceName: resolved.spaceName,
            audienceVideoFeedbackActivated: megaphone?.audienceVideoFeedbackActivated ?? false,
            canRecord: WAMSettingsUtils.canStartRecordingMegaphone(resolved.settings, tags, isLogged),
            enableSoundNotifications: megaphone?.enableSoundNotifications,
            notificationSoundUrl: megaphone?.notificationSoundUrl,
        },
        canBeUsed: WAMSettingsUtils.canUseMegaphone(resolved.settings, tags),
    };
}
