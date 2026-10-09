import { describe, expect, it, vi } from "vitest";
import type { SpaceKind, SpaceUser } from "@workadventure/messages";
import { AutoRecorder } from "../src/Model/AutoRecorder";
import type { EgressFile } from "../src/Model/Interfaces/ICommunicationState";
import type { OpenedSession } from "../src/Model/SessionAnalytics";

const OPENED_AT_MS = Date.parse("2026-10-09T10:00:00.000Z");

const user = (id: string) => ({ spaceUserId: id, uuid: `uuid-${id}` }) as SpaceUser;
const microphone = (trackSid: string) => ({ trackSid, language: "fr-FR", noiseSuppression: "none" });
const session = (kind: SpaceKind = "bubble"): OpenedSession => ({
    eventId: "meeting-event-id",
    kind,
    openedAtMs: OPENED_AT_MS,
    roomId: "https://play.example/@/org/world/office",
});
/** Lets the egress calls, which are promises, settle. */
const settle = () =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });

const harness = async (worldRecorded: boolean | (() => boolean) = true) => {
    let egressCount = 0;
    const state = {
        startTrackEgress: vi.fn((_spaceUserId: string, _trackSid: string, _filepath: string, _s3: unknown) =>
            Promise.resolve(`EG_${++egressCount}`),
        ),
        stopEgress: vi.fn((_egressId: string) => Promise.resolve()),
        getEgressFile: vi.fn((_egressId: string): Promise<EgressFile | undefined> => Promise.resolve(undefined)),
    };
    const writeManifest = vi.fn((_key: string, _manifest: object) => Promise.resolve());
    let now = OPENED_AT_MS;
    const recorder = new AutoRecorder(
        { world: "org/world", getSpaceName: () => "org/world.bubble" },
        () => state as never,
        {
            resolveWorld: typeof worldRecorded === "function" ? worldRecorded : () => Promise.resolve(worldRecorded),
            writeManifest,
            nowMs: () => now,
            manifestDelayMs: 0,
        },
    );
    await recorder.resolve("https://play.example/@/org/world/office");
    const tick = (seconds: number) => {
        now += seconds * 1000;
    };
    return { recorder, state, writeManifest, tick };
};

describe("AutoRecorder", () => {
    it("knows at once when the answer is already known, so the policy reads it in the same handler", () => {
        const recorder = new AutoRecorder(
            { world: "org/world", getSpaceName: () => "org/world.bubble" },
            () => ({}) as never,
            { resolveWorld: () => true },
        );

        expect(recorder.resolve("https://play.example/@/org/world/office")).toBeUndefined();
        expect(recorder.isEnabled).toBe(true);
    });

    it("records nothing in a world that is not recorded", async () => {
        const { recorder, state } = await harness(false);

        recorder.microphonePublished(user("a"), microphone("TR_a"));
        recorder.sessionChanged(session());

        expect(recorder.isEnabled).toBe(false);
        expect(state.startTrackEgress).not.toHaveBeenCalled();
    });

    it("records each microphone once the meeting opens, in the meeting's folder, named after a hash of the speaker", async () => {
        const { recorder, state, tick } = await harness();

        recorder.microphonePublished(user("a"), microphone("TR_a"));
        expect(state.startTrackEgress).not.toHaveBeenCalled();

        recorder.sessionChanged(session());
        tick(5);
        recorder.microphonePublished(user("b"), microphone("TR_b"));

        expect(state.startTrackEgress.mock.calls.map(([spaceUserId, trackSid]) => [spaceUserId, trackSid])).toEqual([
            ["a", "TR_a"],
            ["b", "TR_b"],
        ]);
        const files = state.startTrackEgress.mock.calls.map(([, , filepath]) => filepath);
        expect(files[0]).toMatch(/^org_world\/office\/2026-10-09\/meeting-event-id\/[0-9a-f]{16}-\d+\.ogg$/);
        expect(files[0]).not.toContain("uuid-a");
        expect(files[1]).toContain(`-${OPENED_AT_MS + 5000}.ogg`);
    });

    it("does not record a broadcast", async () => {
        const { recorder, state } = await harness();

        recorder.microphonePublished(user("a"), microphone("TR_a"));
        recorder.sessionChanged(session("megaphone"));

        expect(state.startTrackEgress).not.toHaveBeenCalled();
    });

    it("records a new publication of a microphone to a new file, and only once", async () => {
        const { recorder, state } = await harness();
        recorder.sessionChanged(session());

        recorder.microphonePublished(user("a"), microphone("TR_1"));
        await settle();
        recorder.microphonePublished(user("a"), microphone("TR_1"));
        recorder.microphonePublished(user("a"), microphone("TR_2"));
        await settle();

        expect(state.startTrackEgress.mock.calls.map(([, trackSid]) => trackSid)).toEqual(["TR_1", "TR_2"]);
        expect(state.stopEgress).toHaveBeenCalledWith("EG_1");
    });

    it("stops recording a member who leaves", async () => {
        const { recorder, state } = await harness();
        recorder.sessionChanged(session());
        recorder.microphonePublished(user("a"), microphone("TR_a"));
        await settle();

        recorder.userLeft("a");

        expect(state.stopEgress).toHaveBeenCalledWith("EG_1");
    });

    it("writes a manifest when the meeting ends, with the times each file really starts at", async () => {
        const { recorder, state, writeManifest, tick } = await harness();
        state.getEgressFile.mockResolvedValue({
            startedAtMs: OPENED_AT_MS + 1500,
            endedAtMs: OPENED_AT_MS + 60_000,
            durationMs: 58_500,
        });
        recorder.sessionChanged(session());
        recorder.microphonePublished(user("a"), microphone("TR_a"));
        await settle();
        tick(60);

        recorder.sessionChanged(undefined);
        expect(state.stopEgress).toHaveBeenCalledWith("EG_1");
        await settle();
        await settle();

        expect(writeManifest).toHaveBeenCalledTimes(1);
        const [key, manifest] = writeManifest.mock.calls[0];
        expect(key).toBe("org_world/office/2026-10-09/meeting-event-id/manifest.json");
        expect(manifest).toMatchObject({
            meetingId: "meeting-event-id",
            kind: "bubble",
            startedAt: "2026-10-09T10:00:00.000Z",
            endedAt: "2026-10-09T10:01:00.000Z",
            tracks: [
                {
                    egressId: "EG_1",
                    codec: "opus",
                    language: "fr-FR",
                    noiseSuppression: "none",
                    offsetSeconds: 1.5,
                    durationSeconds: 58.5,
                    timesFromEgress: true,
                },
            ],
        });
    });

    it("stops recording the meeting within a minute of its world no longer being recorded", async () => {
        vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
        try {
            let recorded = true;
            const { recorder, state, writeManifest } = await harness(() => recorded);
            recorder.microphonePublished(user("a"), microphone("TR_a"));
            recorder.sessionChanged(session());
            await settle();

            recorded = false;
            vi.advanceTimersByTime(60_000);
            await settle();

            expect(state.stopEgress).toHaveBeenCalledWith("EG_1");
            expect(writeManifest).toHaveBeenCalledOnce();
            recorder.microphonePublished(user("b"), microphone("TR_b"));
            expect(state.startTrackEgress).toHaveBeenCalledOnce();
        } finally {
            vi.useRealTimers();
        }
    });

    it("writes no manifest for a meeting nobody spoke in", async () => {
        const { recorder, writeManifest } = await harness();

        recorder.sessionChanged(session());
        recorder.sessionChanged(undefined);
        await settle();

        expect(writeManifest).not.toHaveBeenCalled();
    });
});
