import { z } from "zod";
import type { WAMSettings } from "./types";
import { MegaphoneRecordingSettings } from "./types";

/**
 * The settings of the world megaphone, stored once for the whole world and shared by every map
 * whose megaphone has the World scope. Which maps join it, and who may speak on each, stay settings
 * of each map (`megaphone.enabled`, `scope` and `rights` in its WAM).
 */
export const WorldMegaphoneSettings = z.object({
    audienceVideoFeedbackActivated: z.boolean().optional(),
    notificationSoundUrl: z.string().optional(),
    enableSoundNotifications: z.boolean().optional(),
    recording: MegaphoneRecordingSettings.optional(),
});
export type WorldMegaphoneSettings = z.infer<typeof WorldMegaphoneSettings>;

export const WorldSettings = z.object({
    megaphone: WorldMegaphoneSettings.optional(),
    /** What the migration from the WAM files could not carry over as is, for an admin to review. */
    migrationWarnings: z.array(z.string()).optional(),
});
export type WorldSettings = z.infer<typeof WorldSettings>;

export const WORLD_SETTINGS_FILE_NAME = "__world-settings.json";

/** The metadata key of the world space that changes each time the world settings are saved. */
export const WORLD_SETTINGS_REVISION_METADATA_KEY = "worldSettingsRevision";

function majority<T>(values: T[]): { value: T; unanimous: boolean } {
    const counts = new Map<string, { value: T; count: number }>();
    for (const value of values) {
        const key = JSON.stringify(value) ?? "undefined";
        const entry = counts.get(key) ?? { value, count: 0 };
        entry.count++;
        counts.set(key, entry);
    }
    const sorted = [...counts.values()].sort((a, b) => b.count - a.count);
    return { value: sorted[0].value, unanimous: sorted.length === 1 };
}

/**
 * Builds the world settings from the megaphone settings each map used to hold: every map whose
 * megaphone has the World scope now shares them, so values the maps disagreed on are reported.
 *
 * @param wamSettingsByMap the settings of every WAM of the world, keyed by WAM path
 */
export function migrateWorldSettingsFromWams(wamSettingsByMap: Record<string, WAMSettings | undefined>): WorldSettings {
    const worldMaps = Object.entries(wamSettingsByMap)
        .flatMap(([mapPath, settings]) => {
            const megaphone = settings?.megaphone;
            return megaphone?.enabled && megaphone.scope === "WORLD" ? [{ mapPath, megaphone }] : [];
        })
        .sort((a, b) => a.mapPath.localeCompare(b.mapPath));
    if (worldMaps.length === 0) {
        return {};
    }

    const warnings: string[] = [];
    const titles = new Set(worldMaps.map(({ megaphone }) => megaphone.title ?? ""));
    if (titles.size > 1) {
        warnings.push(
            `The World megaphones ${[...titles].map((title) => `"${title}"`).join(", ")} are now one world megaphone.`,
        );
    }
    const pick = <K extends keyof WorldMegaphoneSettings>(key: K): WorldMegaphoneSettings[K] => {
        const { value, unanimous } = majority(worldMaps.map(({ megaphone }) => megaphone[key]));
        if (!unanimous) {
            warnings.push(`The maps disagreed on "${String(key)}": the most common value was kept.`);
        }
        return value;
    };

    return {
        megaphone: WorldMegaphoneSettings.parse({
            audienceVideoFeedbackActivated: pick("audienceVideoFeedbackActivated"),
            notificationSoundUrl: pick("notificationSoundUrl"),
            enableSoundNotifications: pick("enableSoundNotifications"),
            recording: pick("recording"),
        }),
        ...(warnings.length > 0 ? { migrationWarnings: warnings } : {}),
    };
}

export interface ResolvedMegaphone {
    /** The space every user of the megaphone joins. */
    spaceName: string;
    /** The settings in effect on this map, in the WAM shape that WAMSettingsUtils reads. */
    settings: WAMSettings;
}

/**
 * The megaphone of a map, as set in its WAM: limited to the map (Map scope), or the world megaphone
 * (World scope), which every such map of the world joins with the world's settings and its own rights.
 */
export function resolveMegaphone(
    wamSettings: WAMSettings | undefined,
    worldSettings: WorldSettings | undefined,
    roomGroup: string | null,
    roomUrl: string,
): ResolvedMegaphone | undefined {
    const megaphone = wamSettings?.megaphone;
    if (!megaphone?.enabled) {
        return undefined;
    }
    if (megaphone.scope === "ROOM") {
        return {
            spaceName: `${roomUrl}/megaphone-${megaphone.title}`.replace(/^https?:\/\//, "").replace(/\//g, "-"),
            settings: wamSettings ?? {},
        };
    }
    if (!roomGroup) {
        return undefined;
    }
    return {
        spaceName: `${roomGroup}/megaphone`.replace(/^https?:\/\//, "").replace(/\//g, "-"),
        settings: {
            ...wamSettings,
            megaphone: { enabled: true, scope: "WORLD", rights: megaphone.rights, ...worldSettings?.megaphone },
        },
    };
}
