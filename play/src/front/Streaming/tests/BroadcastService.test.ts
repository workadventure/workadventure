import { describe, expect, it, vi } from "vitest";
import { readable, writable } from "svelte/store";
import { Subject } from "rxjs";
import { FilterType } from "@workadventure/messages";
import type { SpaceInterface } from "../../Space/SpaceInterface";
import type { SpaceRegistryInterface } from "../../Space/SpaceRegistry/SpaceRegistryInterface";
import { BroadcastService } from "../BroadcastService";

vi.mock("../../Phaser/Game/GameManager", () => ({
    gameManager: {
        getCurrentGameScene: vi.fn(() => ({
            load: {},
            sound: {},
        })),
    },
}));

function createMockSpace() {
    const hasRemoteSpeakerStore = writable(false);
    // Held here rather than read back off `space`: an unbound method reference is an
    // eslint error, and these two are the whole point of the audience assertions.
    const startListenerStreaming = vi.fn();
    const stopListenerStreaming = vi.fn();
    const space = {
        usersStore: readable(new Map()),
        observeUserJoined: new Subject().asObservable(),
        observeUserLeft: new Subject().asObservable(),
        hasRemoteSpeakerStore,
        startListenerStreaming,
        stopListenerStreaming,
        getName: vi.fn(() => "megaphone-space"),
    } as unknown as SpaceInterface;

    return { space, hasRemoteSpeakerStore, startListenerStreaming, stopListenerStreaming };
}

function createService(space: SpaceInterface) {
    const joinSpace = vi.fn().mockResolvedValue(space);
    const spaceRegistry = {
        joinSpace,
        leaveSpace: vi.fn().mockResolvedValue(undefined),
    } as unknown as SpaceRegistryInterface;

    return {
        joinSpace,
        service: new BroadcastService(spaceRegistry, undefined, [], new AbortController().signal),
    };
}

describe("BroadcastService", () => {
    it("should use screenSharingState watch field when feedback is disabled", async () => {
        const { space } = createMockSpace();
        const { service, joinSpace } = createService(space);

        await service.joinSpace("Megaphone Space", new AbortController().signal, false);

        expect(joinSpace).toHaveBeenCalledWith(
            "megaphone-space",
            FilterType.LIVE_STREAMING_USERS,
            ["screenSharingState", "cameraState", "microphoneState", "megaphoneState"],
            expect.any(AbortSignal),
            expect.any(Object),
        );
    });

    it("should use screenSharingState and attendeesState watch fields when feedback is enabled", async () => {
        const { space } = createMockSpace();
        const { service, joinSpace } = createService(space);

        await service.joinSpace("Megaphone Space", new AbortController().signal, true);

        expect(joinSpace).toHaveBeenCalledWith(
            "megaphone-space",
            FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK,
            ["screenSharingState", "cameraState", "microphoneState", "megaphoneState", "attendeesState"],
            expect.any(AbortSignal),
            expect.any(Object),
        );
    });

    it("should publish the audience only while a speaker is on air", async () => {
        const { space, hasRemoteSpeakerStore, startListenerStreaming, stopListenerStreaming } = createMockSpace();
        const { service } = createService(space);

        await service.joinSpace("Megaphone Space", new AbortController().signal, true);

        // Nobody on air yet: joining must not emit an attendeesState the space never had.
        expect(startListenerStreaming).not.toHaveBeenCalled();
        expect(stopListenerStreaming).not.toHaveBeenCalled();

        hasRemoteSpeakerStore.set(true);
        expect(startListenerStreaming).toHaveBeenCalledTimes(1);

        hasRemoteSpeakerStore.set(false);
        expect(stopListenerStreaming).toHaveBeenCalledTimes(1);
    });

    it("should leave the audience alone when there is no feedback to give", async () => {
        const { space, hasRemoteSpeakerStore, startListenerStreaming } = createMockSpace();
        const { service } = createService(space);

        await service.joinSpace("Megaphone Space", new AbortController().signal, false);
        hasRemoteSpeakerStore.set(true);

        // startListenerStreaming throws outside a WITH_FEEDBACK space.
        expect(startListenerStreaming).not.toHaveBeenCalled();
    });
});
