import { afterEach, describe, expect, it, vi } from "vitest";
import { FilterType, SpaceUser } from "@workadventure/messages";
import { emptySpaceState } from "@workadventure/shared-utils";
import type { SpaceState } from "@workadventure/shared-utils";
import { FOLLOW_GRACE_MS, RecordingManager } from "../src/Model/RecordingManager";
import type { ICommunicationSpace } from "../src/Model/Interfaces/ICommunicationSpace";
import type { IRecordableState } from "../src/Model/Interfaces/ICommunicationState";
import type { IRecordableStrategy } from "../src/Model/Interfaces/ICommunicationStrategy";
import { CommunicationType } from "../src/Model/Types/CommunicationTypes";
import type { ITransitionOrchestrator } from "../src/Model/Interfaces/ITransitionOrchestrator";
import type { IUserRegistry } from "../src/Model/Interfaces/IUserRegistry";
import type { IStateLifecycleManager } from "../src/Model/Interfaces/IStateLifecycleManager";
import type * as EnvironmentVariable from "../src/Enum/EnvironmentVariable";

vi.mock("../src/Enum/EnvironmentVariable", async (importOriginal) => ({
    ...(await importOriginal<typeof EnvironmentVariable>()),
    LIVEKIT_RECORDING_WITH_MAP: true,
}));

/** A bubble space with its own recording manager, on LiveKit. */
function bubble(name: string, kind: string | null = "bubble") {
    const stop = vi.fn().mockResolvedValue(undefined);
    const state = {
        communicationType: CommunicationType.LIVEKIT,
        handleStartRecording: vi.fn().mockResolvedValue({ egressId: `egress-${name}`, roomName: name }),
        handleStopRecording: stop,
    } as unknown as IRecordableState<IRecordableStrategy>;
    const spaceState: SpaceState = { ...emptySpaceState(), kind: (kind ?? undefined) as SpaceState["kind"] };
    const users = new Map<string, SpaceUser>();
    const space = {
        getSpaceName: () => name,
        getState: () => spaceState,
        updateState: (mutate: (state: SpaceState) => void) => mutate(spaceState),
        world: "world",
        filterType: FilterType.ALL_USERS,
    } as unknown as ICommunicationSpace;
    const manager = new RecordingManager(
        space,
        {} as ITransitionOrchestrator,
        { getUsers: () => users } as unknown as IUserRegistry,
        { getCurrentState: () => state } as unknown as IStateLifecycleManager,
    );
    return { manager, stop, spaceState, users, recording: () => spaceState.recording };
}

const user = (uuid: string, spaceUserId: string) =>
    SpaceUser.fromPartial({ uuid, spaceUserId, name: uuid, playUri: "http://play.test/~/map.wam" });

async function startFollowing(uuid: string) {
    const first = bubble(`${uuid}-bubble-1`);
    const recorder = user(uuid, `${uuid}_1`);
    await first.manager.startRecording(recorder, true);
    first.manager.confirmRecordingStartedByWebhook(
        first.manager.getRecordingSessionIds()[0],
        `egress-${uuid}-bubble-1`,
        `${uuid}-bubble-1`,
    );
    return { first, recorder };
}

describe("A recording over the map of a bubble follows the person recording", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("outlives the bubble it started in, shows in the next one and stops from there", async () => {
        const { first, recorder } = await startFollowing("alice");
        expect(first.recording()).toMatchObject({ recording: true, recorder: "alice_1" });

        // The bubble breaks up: Alice leaves, the last camera leaves, the space is destroyed. Nothing stops.
        await first.manager.stopRecordingIfRecorderMatches("alice_1");
        await first.manager.stopRecordingByServer();
        first.manager.destroy();
        expect(first.stop).not.toHaveBeenCalled();
        expect(first.recording()).toMatchObject({ recording: false, status: "idle" });

        // Alice is in a new bubble: it shows the recording and stays on LiveKit.
        const second = bubble("alice-bubble-2");
        second.manager.handleAddUser(user("alice", "alice_2"));
        expect(second.recording()).toMatchObject({ recording: true, recorder: "alice_2", status: "recording" });
        expect(second.manager.isRecording).toBe(true);
        await expect(second.manager.startRecording(user("bob", "bob_2"))).rejects.toThrow("already started");

        // Stopping from there stops the egress of the first bubble.
        await second.manager.stopRecording(user("alice", "alice_2"));
        expect(first.stop).toHaveBeenCalledWith("egress-alice-bubble-1");
        expect(second.recording()).toMatchObject({ status: "stopping" });

        // The end reaches the first bubble's manager (it got the webhooks), and the new bubble is free again.
        const ended = first.manager.finishRecordingByWebhook(
            first.manager.getRecordingSessionIds()[0],
            "egress-alice-bubble-1",
            "alice-bubble-1",
        );
        expect(ended).toMatchObject({ processed: true, recorder });
        expect(second.recording()).toMatchObject({ recording: false, status: "idle" });
        expect(second.manager.isRecording).toBe(false);
    });

    it("stops once the person has been in no bubble for a while", async () => {
        vi.useFakeTimers();
        const { first } = await startFollowing("carol");
        await first.manager.stopRecordingIfRecorderMatches("carol_1");

        // Back in a bubble in time: it goes on.
        vi.advanceTimersByTime(FOLLOW_GRACE_MS - 1000);
        const second = bubble("carol-bubble-2");
        second.manager.handleAddUser(user("carol", "carol_2"));
        await second.manager.stopRecordingIfRecorderMatches("carol_2");
        vi.advanceTimersByTime(FOLLOW_GRACE_MS - 1000);
        expect(first.stop).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1000);
        await vi.waitFor(() => expect(first.stop).toHaveBeenCalledWith("egress-carol-bubble-1"));
    });

    it("lets only the person recording direct it, from whichever bubble they are in", async () => {
        const { first } = await startFollowing("erin");
        expect(first.recording()?.production).toEqual({ layout: "balanced", zoom: "wide", frame: null, pins: [] });

        await first.manager.stopRecordingIfRecorderMatches("erin_1");
        const second = bubble("erin-bubble-2");
        const erin = user("erin", "erin_2");
        second.manager.handleAddUser(erin);

        const production = { layout: "cameras", zoom: "whole", frame: null, pins: ["frank_2"] } as const;
        expect(() => second.manager.setProduction(user("frank", "frank_2"), { ...production, pins: [] })).toThrow(
            "Only the person recording",
        );
        second.manager.setProduction(erin, { ...production, pins: [...production.pins] });
        expect(second.recording()?.production).toEqual(production);
        await second.manager.stopRecording(erin);
    });

    it("waits for the space to say it is a bubble before showing there", async () => {
        const { first } = await startFollowing("dave");
        await first.manager.stopRecordingIfRecorderMatches("dave_1");

        const area = bubble("dave-somewhere", null);
        const dave = user("dave", "dave_2");
        area.users.set(dave.spaceUserId, dave);
        area.manager.handleAddUser(dave);
        expect(area.manager.isRecording).toBe(false);

        area.spaceState.kind = "bubble";
        area.manager.handleSpaceKindChanged();
        expect(area.manager.followedRecorder).toBe(dave);
        expect(area.recording()).toMatchObject({ recording: true, recorder: "dave_2" });
        await area.manager.stopRecording(dave);
    });
});
