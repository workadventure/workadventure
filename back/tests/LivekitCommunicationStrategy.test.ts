import { describe, expect, it, vi } from "vitest";
import { SpaceUser } from "@workadventure/messages";
import { LivekitCommunicationStrategy } from "../src/Model/Strategies/LivekitCommunicationStrategy";
import type { ICommunicationSpace } from "../src/Model/Interfaces/ICommunicationSpace";

function createUser(spaceUserId: string): SpaceUser {
    return SpaceUser.fromPartial({
        spaceUserId,
        uuid: `uuid-${spaceUserId}`,
        name: spaceUserId,
    });
}

describe("LivekitCommunicationStrategy", () => {
    it("stops recording through metadata when the last streaming user leaves", async () => {
        const dispatchPrivateEvent = vi.fn();
        const updateMetadata = vi.fn().mockResolvedValue(undefined);

        const space: ICommunicationSpace = {
            getAllUsers: () => [],
            getUsersInFilter: () => [],
            getUsersToNotify: () => [],
            getRecordingState: () => ({ isRecording: true, recorder: "recorder-1" }),
            dispatchPrivateEvent,
            dispatchPublicEvent: vi.fn(),
            getSpaceName: () => "test-space",
            getPropertiesToSync: () => [],
            updateMetadata,
            getUser: vi.fn(),
        };

        const livekitService = {
            deleteRoom: vi.fn().mockResolvedValue(undefined),
        };

        const strategy = new LivekitCommunicationStrategy(space, livekitService as never);
        const streamer = createUser("streamer-1");
        const receiver = createUser("listener-1");

        (
            strategy as unknown as {
                streamingUsers: Map<string, SpaceUser>;
                receivingUsers: Map<string, SpaceUser>;
            }
        ).streamingUsers.set(streamer.spaceUserId, streamer);
        (
            strategy as unknown as {
                streamingUsers: Map<string, SpaceUser>;
                receivingUsers: Map<string, SpaceUser>;
            }
        ).receivingUsers.set(receiver.spaceUserId, receiver);

        strategy.deleteUser(streamer);

        await vi.waitFor(() => {
            expect(updateMetadata).toHaveBeenCalledWith(
                {
                    recording: {
                        recorder: "recorder-1",
                        recording: false,
                    },
                },
                "recorder-1"
            );
            expect(livekitService.deleteRoom).toHaveBeenCalledWith("test-space");
        });
    });

    it("keeps recording running while another streaming user remains", async () => {
        const space: ICommunicationSpace = {
            getAllUsers: () => [],
            getUsersInFilter: () => [],
            getUsersToNotify: () => [],
            getRecordingState: () => ({ isRecording: true, recorder: "recorder-1" }),
            dispatchPrivateEvent: vi.fn(),
            dispatchPublicEvent: vi.fn(),
            getSpaceName: () => "test-space",
            getPropertiesToSync: () => [],
            updateMetadata: vi.fn().mockResolvedValue(undefined),
            getUser: vi.fn(),
        };

        const livekitService = {
            deleteRoom: vi.fn().mockResolvedValue(undefined),
        };

        const strategy = new LivekitCommunicationStrategy(space, livekitService as never);
        const firstStreamer = createUser("streamer-1");
        const secondStreamer = createUser("streamer-2");

        (
            strategy as unknown as {
                streamingUsers: Map<string, SpaceUser>;
            }
        ).streamingUsers.set(firstStreamer.spaceUserId, firstStreamer);
        (
            strategy as unknown as {
                streamingUsers: Map<string, SpaceUser>;
            }
        ).streamingUsers.set(secondStreamer.spaceUserId, secondStreamer);

        strategy.deleteUser(firstStreamer);

        await vi.waitFor(() => {
            expect(
                (
                    strategy as unknown as {
                        streamingUsers: Map<string, SpaceUser>;
                    }
                ).streamingUsers.has(secondStreamer.spaceUserId)
            ).toBe(true);
        });

        expect(space.updateMetadata).not.toHaveBeenCalled();
        expect(livekitService.deleteRoom).not.toHaveBeenCalled();
    });
});
