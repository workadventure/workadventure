import { describe, expect, it } from "vitest";
import type { SpaceInterface } from "../../../Space/SpaceInterface";
import type { RecordingState } from "../../../Stores/RecordingStore";
import {
    getDirectRecordingActionRow,
    getRecordingSpaceRows,
    getShouldDisplayRecordingButton,
    type RecordingSpaceRow,
} from "./RecordingMenuUtils";

function createSpace(
    name: string,
    options?: {
        isMegaphone?: boolean;
        metadata?: Map<string, unknown>;
        mySpaceUserId?: string;
        recorderNamesById?: Record<string, string>;
    }
): SpaceInterface {
    const metadata = options?.metadata ?? new Map<string, unknown>();
    if (options?.isMegaphone) {
        metadata.set("isMegaphoneSpace", true);
    }

    return {
        mySpaceUserId: options?.mySpaceUserId ?? "me",
        getName: () => name,
        getMetadata: () => metadata,
        getSpaceUserBySpaceUserId: (spaceUserId: string) => {
            const nameById = options?.recorderNamesById?.[spaceUserId];
            return nameById
                ? ({ name: nameById } as ReturnType<SpaceInterface["getSpaceUserBySpaceUserId"]>)
                : undefined;
        },
    } as SpaceInterface;
}

function createStartRow(space: SpaceInterface): RecordingSpaceRow {
    return {
        action: "start",
        disabled: false,
        kind: "discussion",
        recorderName: null,
        recorderSpaceUserId: null,
        space,
        spaceName: space.getName(),
        status: "available",
    };
}

describe("RecordingMenuUtils", () => {
    it("opens the picker instead of applying a direct action when several spaces are recordable", () => {
        const discussionSpace = createSpace("discussion-space");
        const megaphoneSpace = createSpace("megaphone-space", { isMegaphone: true });
        const rows = [createStartRow(discussionSpace)];

        expect(
            getDirectRecordingActionRow(rows, [discussionSpace, megaphoneSpace], [discussionSpace, megaphoneSpace])
        ).toBeUndefined();
    });

    it("shows the recording button when another recording is already active, even without startable spaces", () => {
        const discussionSpace = createSpace("discussion-space", {
            metadata: new Map([
                [
                    "recording",
                    {
                        recording: true,
                        recorder: "alice-id",
                    },
                ],
            ]),
            recorderNamesById: {
                "alice-id": "Alice",
            },
        });
        const recordingState: RecordingState = {
            recordingsBySpace: {},
            requestStatesBySpace: {},
            isRecording: false,
            isCurrentUserRecorder: false,
        };

        const rows = getRecordingSpaceRows([discussionSpace], [], recordingState, false);

        expect(rows).toHaveLength(1);
        expect(rows[0]?.status).toBe("recording-other");
        expect(rows[0]?.action).toBeNull();
    });

    it("prefers the live space user name over the cached recorder name and falls back safely", () => {
        const liveNameSpace = createSpace("live-name-space", {
            recorderNamesById: {
                "alice-id": "Alice",
            },
        });
        const fallbackNameSpace = createSpace("fallback-name-space");
        const recordingState: RecordingState = {
            recordingsBySpace: {
                "live-name-space": {
                    isCurrentUserRecorder: false,
                    recorderName: "Cached Alice",
                    recorderSpaceUserId: "alice-id",
                },
                "fallback-name-space": {
                    isCurrentUserRecorder: false,
                    recorderName: "Cached Bob",
                    recorderSpaceUserId: "bob-id",
                },
            },
            requestStatesBySpace: {},
            isRecording: true,
            isCurrentUserRecorder: false,
        };

        const rows = getRecordingSpaceRows([liveNameSpace, fallbackNameSpace], [], recordingState, false);

        expect(rows.find((row) => row.spaceName === "live-name-space")?.recorderName).toBe("Alice");
        expect(rows.find((row) => row.spaceName === "fallback-name-space")?.recorderName).toBe("Cached Bob");
    });

    it("keeps the recording button visible when a space is recordable but start is currently disabled", () => {
        const discussionSpace = createSpace("discussion-space");

        expect(getShouldDisplayRecordingButton([], [discussionSpace])).toBe(true);
    });

    it("hides the recording button when the room policy marks it as hidden", () => {
        const discussionSpace = createSpace("discussion-space");

        expect(getShouldDisplayRecordingButton([], [discussionSpace], "hidden")).toBe(false);
    });

    it("keeps the recording button visible when the room policy is hidden but a recording is already active", () => {
        const discussionSpace = createSpace("discussion-space", {
            metadata: new Map([
                [
                    "recording",
                    {
                        recording: true,
                        recorder: "alice-id",
                    },
                ],
            ]),
            recorderNamesById: {
                "alice-id": "Alice",
            },
        });
        const recordingState: RecordingState = {
            recordingsBySpace: {},
            requestStatesBySpace: {},
            isRecording: false,
            isCurrentUserRecorder: false,
        };

        const rows = getRecordingSpaceRows([discussionSpace], [], recordingState, false);

        expect(getShouldDisplayRecordingButton(rows, [], "hidden")).toBe(true);
    });
});
