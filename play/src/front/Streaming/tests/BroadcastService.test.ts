import { describe, expect, it, vi } from "vitest";
import { readable } from "svelte/store";
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

describe("BroadcastService", () => {
    it("should use screenSharingState watch field when feedback is disabled", async () => {
        const joinSpace = vi.fn();
        const leaveSpace = vi.fn().mockResolvedValue(undefined);
        const observeUserJoined = new Subject();
        const observeUserLeft = new Subject();

        const mockSpace = {
            usersStore: readable(new Map()),
            observeUserJoined: observeUserJoined.asObservable(),
            observeUserLeft: observeUserLeft.asObservable(),
            startListenerStreaming: vi.fn(),
            stopListenerStreaming: vi.fn(),
            getName: vi.fn(() => "megaphone-space"),
        } as unknown as SpaceInterface;

        joinSpace.mockResolvedValue(mockSpace);

        const spaceRegistry = {
            joinSpace,
            leaveSpace,
        } as unknown as SpaceRegistryInterface;

        const service = new BroadcastService(spaceRegistry, undefined, [], new AbortController().signal);

        await service.joinSpace("Megaphone Space", new AbortController().signal, false);

        expect(joinSpace).toHaveBeenCalledWith(
            "megaphone-space",
            FilterType.LIVE_STREAMING_USERS,
            ["screenSharingState", "cameraState", "microphoneState", "megaphoneState"],
            expect.any(AbortSignal),
            expect.any(Object)
        );
    });

    it("should use screenSharingState and attendeesState watch fields when feedback is enabled", async () => {
        const joinSpace = vi.fn();
        const leaveSpace = vi.fn().mockResolvedValue(undefined);
        const observeUserJoined = new Subject();
        const observeUserLeft = new Subject();

        const mockSpace = {
            usersStore: readable(new Map()),
            observeUserJoined: observeUserJoined.asObservable(),
            observeUserLeft: observeUserLeft.asObservable(),
            startListenerStreaming: vi.fn(),
            stopListenerStreaming: vi.fn(),
            getName: vi.fn(() => "megaphone-space"),
        } as unknown as SpaceInterface;

        joinSpace.mockResolvedValue(mockSpace);

        const spaceRegistry = {
            joinSpace,
            leaveSpace,
        } as unknown as SpaceRegistryInterface;

        const service = new BroadcastService(spaceRegistry, undefined, [], new AbortController().signal);

        await service.joinSpace("Megaphone Space", new AbortController().signal, true);

        expect(joinSpace).toHaveBeenCalledWith(
            "megaphone-space",
            FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK,
            ["screenSharingState", "cameraState", "microphoneState", "megaphoneState", "attendeesState"],
            expect.any(AbortSignal),
            expect.any(Object)
        );
    });
});
