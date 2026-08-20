import { describe, expect, it } from "vitest";
import type {
    FloorHolderEntry,
    ProximityPollDefinitionMetadata,
    ProximityQAUpvoteMetadata,
    RaisedHandEntry,
    RecordingMetadata,
} from "../src/SpaceMetadata";
import {
    getProximityPollDefinitionMetadataKey,
    getProximityQAUpvoteMetadataKey,
    isServerOwnedSpaceMetadataKey,
    parseIncomingSpaceMetadata,
    parseStoredSpaceMetadata,
} from "../src/SpaceMetadata";

const pollDefinition = {
    id: "poll-1",
    question: "Can we record?",
    kind: "closed" as const,
    answers: [
        { id: "a", text: "Yes" },
        { id: "b", text: "No" },
    ],
    maxSelections: 1,
    senderId: "sender-1",
    createdAt: 10,
};

describe("SpaceMetadataCatalog", () => {
    describe("stored values", () => {
        it("should type an exact key from the catalogue", () => {
            // The annotations are the point of the test: they only compile if the conditional type resolved
            // to the schema's shape instead of falling back to `unknown`.
            const queue: RaisedHandEntry[] | undefined = parseStoredSpaceMetadata("raisedHands", [
                { spaceUserId: "user-1", name: "Alice", at: 10 },
            ]);
            const holders: FloorHolderEntry[] | undefined = parseStoredSpaceMetadata("floorHolders", [
                { spaceUserId: "user-1", name: "Alice" },
            ]);
            const recording: RecordingMetadata | undefined = parseStoredSpaceMetadata("recording", {
                recording: true,
                recorder: "user-1",
                status: "recording",
            });

            expect(queue).toEqual([{ spaceUserId: "user-1", name: "Alice", at: 10 }]);
            expect(holders).toEqual([{ spaceUserId: "user-1", name: "Alice" }]);
            expect(recording).toEqual({ recording: true, recorder: "user-1", status: "recording" });
        });

        it("should type a prefixed key from the catalogue", () => {
            const poll: ProximityPollDefinitionMetadata | undefined = parseStoredSpaceMetadata(
                getProximityPollDefinitionMetadataKey("poll-1"),
                pollDefinition,
            );
            const upvote: ProximityQAUpvoteMetadata | undefined = parseStoredSpaceMetadata(
                getProximityQAUpvoteMetadataKey("question-1", "voter-1"),
                { questionId: "question-1", voterId: "voter-1", upvoted: true, updatedAt: 11 },
            );

            expect(poll).toEqual(pollDefinition);
            expect(upvote?.upvoted).toBe(true);
        });

        // A prefix must never swallow a longer one: "proximityPoll:" and "proximityPollVote:" are distinct
        // families, and only the trailing ":" keeps them apart.
        it("should not confuse two prefixes sharing a stem", () => {
            expect(parseStoredSpaceMetadata("proximityPollVote:poll-1:voter-1", pollDefinition)).toBeUndefined();
            expect(
                parseStoredSpaceMetadata("proximityPollVote:poll-1:voter-1", {
                    pollId: "poll-1",
                    voterId: "voter-1",
                    answerIds: ["a"],
                    updatedAt: 12,
                }),
            ).toEqual({ pollId: "poll-1", voterId: "voter-1", answerIds: ["a"], updatedAt: 12 });
        });

        it("should degrade to undefined instead of throwing on a corrupt value", () => {
            expect(parseStoredSpaceMetadata("raisedHands", "nope")).toBeUndefined();
            expect(parseStoredSpaceMetadata("raisedHands", [{ spaceUserId: "" }])).toBeUndefined();
            expect(parseStoredSpaceMetadata("proximityPoll:poll-1", { id: "poll-1" })).toBeUndefined();
        });

        // The scripting API (WA.spaces) lets a map author publish whatever they like.
        it("should let an unknown key through untouched", () => {
            const value = { anything: [1, 2, 3] };
            expect(parseStoredSpaceMetadata("myCustomScriptingKey", value)).toBe(value);
        });
    });

    describe("incoming values", () => {
        it("should accept the raise-hand intent, which is not the stored shape", () => {
            expect(parseIncomingSpaceMetadata("raisedHands", { raised: true })).toEqual({ raised: true });
            expect(parseIncomingSpaceMetadata("floorHolders", { holds: false })).toEqual({ holds: false });
        });

        it.each([[undefined], [null], ["true"], [{}], [{ raised: "true" }]])(
            "should reject the malformed raise-hand payload %j",
            (payload) => {
                expect(() => parseIncomingSpaceMetadata("raisedHands", payload)).toThrow();
            },
        );

        it("should refuse a client write on a server-owned key", () => {
            expect(isServerOwnedSpaceMetadataKey("recording")).toBe(true);
            expect(isServerOwnedSpaceMetadataKey("raisedHands")).toBe(false);
            expect(isServerOwnedSpaceMetadataKey("myCustomScriptingKey")).toBe(false);
            expect(() => parseIncomingSpaceMetadata("recording", { recording: true })).toThrow(/set by the server/);
        });

        it("should enforce the shared upper bounds", () => {
            expect(() =>
                parseIncomingSpaceMetadata(getProximityPollDefinitionMetadataKey("poll-1"), {
                    ...pollDefinition,
                    question: "x".repeat(341),
                }),
            ).toThrow();
        });

        it("should let an unknown key through untouched", () => {
            const value = { anything: true };
            expect(parseIncomingSpaceMetadata("myCustomScriptingKey", value)).toBe(value);
        });
    });
});
