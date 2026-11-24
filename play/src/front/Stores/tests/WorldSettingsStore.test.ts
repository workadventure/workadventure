import { describe, expect, it, vi } from "vitest";
import { Subject } from "rxjs";
import { WORLD_SETTINGS_REVISION_METADATA_KEY } from "@workadventure/map-editor";
import type { EditMapCommandMessage } from "@workadventure/messages";
import type { SpaceInterface } from "../../Space/SpaceInterface";
import { getMegaphoneStoreValues, getWorldSettingsUrl, saveWorldSettings } from "../WorldSettingsStore";

describe("world settings location", () => {
    it("sits at the map-storage root, under its prefix", () => {
        const wamUrl = "https://maps.test/map-storage/office/floor%201.wam";
        expect(getWorldSettingsUrl(wamUrl, "/map-storage").toString()).toBe(
            "https://maps.test/map-storage/__world-settings.json",
        );
    });
});

describe("saveWorldSettings", () => {
    function setup() {
        const stream = new Subject<EditMapCommandMessage>();
        const emitUpdateSpaceMetadata = vi.fn();
        const emit = vi.fn((commandId: string) => {
            queueMicrotask(() => stream.next({ id: commandId, editMapMessage: { message: undefined } }));
        });
        const deps = {
            emit,
            editMapCommandMessageStream: stream.asObservable(),
            worldSpace: { emitUpdateSpaceMetadata } as unknown as SpaceInterface,
        };
        return { stream, emit, emitUpdateSpaceMetadata, deps };
    }

    it("tells the world to re-read the settings once the map-storage saved them", async () => {
        const { emit, emitUpdateSpaceMetadata, deps } = setup();
        await saveWorldSettings({}, deps);
        const commandId = emit.mock.calls[0][0];
        expect(emitUpdateSpaceMetadata).toHaveBeenCalledWith(
            new Map([[WORLD_SETTINGS_REVISION_METADATA_KEY, commandId]]),
        );
    });

    it("tells no one when the map-storage refused them", async () => {
        const { stream, emitUpdateSpaceMetadata, deps } = setup();
        deps.emit = vi.fn((commandId: string) => {
            queueMicrotask(() =>
                stream.next({
                    id: commandId,
                    editMapMessage: {
                        message: { $case: "errorCommandMessage", errorCommandMessage: { reason: "not an editor" } },
                    },
                }),
            );
        });
        await expect(saveWorldSettings({}, deps)).rejects.toThrow("not an editor");
        expect(emitUpdateSpaceMetadata).not.toHaveBeenCalled();
    });
});

describe("getMegaphoneStoreValues", () => {
    it("takes the Auditorium mode and the rights from the resolved settings", () => {
        const values = getMegaphoneStoreValues(
            {
                spaceName: "world-megaphone",
                settings: { megaphone: { enabled: true, audienceVideoFeedbackActivated: true, rights: ["speaker"] } },
            },
            ["admin"],
            true,
        );
        expect(values.spaceSettings?.spaceName).toBe("world-megaphone");
        expect(values.spaceSettings?.audienceVideoFeedbackActivated).toBe(true);
        expect(values.canBeUsed).toBe(false);
    });

    it("has no megaphone space when none is in effect", () => {
        expect(getMegaphoneStoreValues(undefined, [], true)).toEqual({ spaceSettings: undefined, canBeUsed: false });
    });
});
