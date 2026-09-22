import { describe, expect, it } from "vitest";
import type { WAMFileFormat } from "@workadventure/map-editor";
import { findBroadcastablePlayAudioProperty } from "../src/Services/EntitySoundValidator";

const SOUND_URL = "https://example.com/gong.mp3";

function createWam(properties: WAMFileFormat["entities"][string]["properties"]): WAMFileFormat {
    return {
        version: "1",
        mapUrl: "https://example.com/maps/test.tmj",
        entities: {
            "entity-1": { x: 32, y: 64, prefabRef: { id: "prefab-1", collectionName: "Office" }, properties },
        },
        areas: [],
        entityCollections: [],
        settings: {},
    };
}

const broadcastable = { id: "prop-1", type: "playAudio", audioLink: SOUND_URL, playForAllUsers: true } as const;

describe("EntitySoundValidator", () => {
    describe("findBroadcastablePlayAudioProperty", () => {
        it("should return the property when the entity authorises that sound", () => {
            const wam = createWam([broadcastable]);

            expect(findBroadcastablePlayAudioProperty(wam, "entity-1", SOUND_URL)).toEqual(broadcastable);
        });

        it("should return undefined when the room has no WAM", () => {
            expect(findBroadcastablePlayAudioProperty(undefined, "entity-1", SOUND_URL)).toBeUndefined();
        });

        it("should return undefined when the entity does not exist", () => {
            const wam = createWam([broadcastable]);

            expect(findBroadcastablePlayAudioProperty(wam, "unknown-entity", SOUND_URL)).toBeUndefined();
        });

        it("should return undefined when the entity carries no property", () => {
            expect(findBroadcastablePlayAudioProperty(createWam(undefined), "entity-1", SOUND_URL)).toBeUndefined();
            expect(findBroadcastablePlayAudioProperty(createWam([]), "entity-1", SOUND_URL)).toBeUndefined();
        });

        it("should return undefined when the property is not meant to be broadcast", () => {
            const wam = createWam([{ id: "prop-1", type: "playAudio", audioLink: SOUND_URL }]);

            expect(findBroadcastablePlayAudioProperty(wam, "entity-1", SOUND_URL)).toBeUndefined();
        });

        it("should return undefined when the sound url does not match the property", () => {
            const wam = createWam([broadcastable]);

            expect(findBroadcastablePlayAudioProperty(wam, "entity-1", "https://evil.example/tracker.mp3")).toBe(
                undefined,
            );
        });

        it("should pick the matching property when the entity carries several sounds", () => {
            const other = { id: "prop-2", type: "playAudio", audioLink: "https://example.com/bell.mp3" } as const;
            const wam = createWam([other, broadcastable]);

            expect(findBroadcastablePlayAudioProperty(wam, "entity-1", SOUND_URL)).toEqual(broadcastable);
        });
    });
});
