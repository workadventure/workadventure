import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Subject } from "rxjs";
import type { EntityMessage } from "@workadventure/messages";
import type { PlayAudioPropertyData } from "@workadventure/map-editor";
import type { GameScene } from "../../../../src/front/Phaser/Game/GameScene";
import type { RoomConnection } from "../../../../src/front/Connection/RoomConnection";
import type { Entity } from "../../../../src/front/Phaser/ECS/Entity";

const { playAudio, setVisibility, getBlockAudio } = vi.hoisted(() => ({
    playAudio: vi.fn(),
    setVisibility: vi.fn(),
    getBlockAudio: vi.fn(() => false),
}));

vi.mock("../../../../src/front/Stores/AudioManagerStore", () => ({
    audioManagerFileStore: { playAudio },
    audioManagerVisibilityStore: { set: setVisibility },
}));
vi.mock("../../../../src/front/Connection/LocalUserStore", () => ({
    localUserStore: { getBlockAudio },
}));

import {
    ENTITY_SOUND_MIN_INTERVAL_IN_MS,
    EntityAudioManager,
} from "../../../../src/front/Phaser/Game/EntityAudioManager";

const MAP_URL = "https://example.com/maps/test.tmj";
const SOUND_URL = "https://example.com/gong.mp3";
const ENTITY_ID = "entity-1";

function aBroadcastProperty(overrides: Partial<PlayAudioPropertyData> = {}): PlayAudioPropertyData {
    return { id: "prop-1", type: "playAudio", audioLink: SOUND_URL, playForAllUsers: true, ...overrides };
}

/** The entity sits at (100, 100) and the player at (100, 100) unless the test moves them apart. */
function givenAnEntityAudioManager(properties: PlayAudioPropertyData[] = [aBroadcastProperty()]) {
    const entityMessages = new Subject<EntityMessage>();
    const emitEntitySoundPlayed = vi.fn();
    const player = { x: 100, y: 100 };
    const entity = {
        getProperties: () => properties,
        getActivationRectangle: () => ({ x: 100, y: 100, width: 0, height: 0 }),
    } as unknown as Entity;

    const scene = {
        getMapUrl: () => MAP_URL,
        CurrentPlayer: player,
        getGameMapFrontWrapper: () => ({
            getEntitiesManager: () => ({ getEntities: () => new Map([[ENTITY_ID, entity]]) }),
        }),
    } as unknown as GameScene;

    const connection = {
        entityMessageStream: entityMessages.asObservable(),
        emitEntitySoundPlayed,
    } as unknown as RoomConnection;

    return {
        manager: new EntityAudioManager(scene, connection),
        entityMessages,
        emitEntitySoundPlayed,
        player,
    };
}

function soundPlayedMessage(soundUrl = SOUND_URL, entityId = ENTITY_ID): EntityMessage {
    return { entityId, entityEvent: { event: { $case: "entitySoundPlayed", entitySoundPlayed: { soundUrl } } } };
}

describe("EntityAudioManager", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        getBlockAudio.mockReturnValue(false);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    describe("play", () => {
        it("should broadcast the sound and stay silent when the property is meant for everyone", () => {
            const { manager, emitEntitySoundPlayed } = givenAnEntityAudioManager();

            manager.play(ENTITY_ID, aBroadcastProperty());

            expect(emitEntitySoundPlayed).toHaveBeenCalledWith(ENTITY_ID, SOUND_URL);
            expect(playAudio).not.toHaveBeenCalled();
        });

        it("should play locally with the property volume when the sound is not broadcast", () => {
            const { manager, emitEntitySoundPlayed } = givenAnEntityAudioManager();

            manager.play(ENTITY_ID, aBroadcastProperty({ playForAllUsers: false, volume: 0.2 }));

            expect(emitEntitySoundPlayed).not.toHaveBeenCalled();
            expect(playAudio).toHaveBeenCalledWith(SOUND_URL, MAP_URL, 0.2, false);
        });

        it("should ignore a second broadcast asked for within the minimum interval", () => {
            const { manager, emitEntitySoundPlayed } = givenAnEntityAudioManager();

            manager.play(ENTITY_ID, aBroadcastProperty());
            manager.play(ENTITY_ID, aBroadcastProperty());

            expect(emitEntitySoundPlayed).toHaveBeenCalledTimes(1);
        });

        it("should broadcast again once the minimum interval has elapsed", () => {
            const { manager, emitEntitySoundPlayed } = givenAnEntityAudioManager();

            manager.play(ENTITY_ID, aBroadcastProperty());
            vi.advanceTimersByTime(ENTITY_SOUND_MIN_INTERVAL_IN_MS);
            manager.play(ENTITY_ID, aBroadcastProperty());

            expect(emitEntitySoundPlayed).toHaveBeenCalledTimes(2);
        });
    });

    describe("on a received entity sound", () => {
        it("should play the sound carried by the entity at full volume without a radius", () => {
            const { entityMessages } = givenAnEntityAudioManager();

            entityMessages.next(soundPlayedMessage());

            expect(playAudio).toHaveBeenCalledWith(SOUND_URL, MAP_URL, 1, false);
        });

        it("should lower the volume with the distance to the entity", () => {
            const { entityMessages, player } = givenAnEntityAudioManager([aBroadcastProperty({ audibleRadius: 200 })]);
            player.x = 150; // 50px away from an entity whose radius is 200

            entityMessages.next(soundPlayedMessage());

            expect(playAudio).toHaveBeenCalledWith(SOUND_URL, MAP_URL, 0.75, false);
        });

        it("should stay silent beyond the audible radius", () => {
            const { entityMessages, player } = givenAnEntityAudioManager([aBroadcastProperty({ audibleRadius: 40 })]);
            player.x = 200;

            entityMessages.next(soundPlayedMessage());

            expect(playAudio).not.toHaveBeenCalled();
        });

        it("should ignore a sound the entity does not carry", () => {
            const { entityMessages } = givenAnEntityAudioManager();

            entityMessages.next(soundPlayedMessage("https://evil.example/tracker.mp3"));

            expect(playAudio).not.toHaveBeenCalled();
        });

        it("should ignore an entity it does not know", () => {
            const { entityMessages } = givenAnEntityAudioManager();

            entityMessages.next(soundPlayedMessage(SOUND_URL, "unknown-entity"));

            expect(playAudio).not.toHaveBeenCalled();
        });

        it("should stay silent when the user blocked audio", () => {
            getBlockAudio.mockReturnValue(true);
            const { entityMessages } = givenAnEntityAudioManager();

            entityMessages.next(soundPlayedMessage());

            expect(playAudio).not.toHaveBeenCalled();
            expect(setVisibility).toHaveBeenCalledWith("disabledBySettings");
        });
    });

    describe("destroy", () => {
        it("should stop playing sounds received after destruction", () => {
            const { manager, entityMessages } = givenAnEntityAudioManager();

            manager.destroy();
            entityMessages.next(soundPlayedMessage());

            expect(playAudio).not.toHaveBeenCalled();
        });
    });
});
