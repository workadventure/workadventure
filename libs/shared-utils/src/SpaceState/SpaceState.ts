import { z } from "zod";
import { spaceKindSchema } from "@workadventure/messages";

/**
 * The typed, server-owned state of a space.
 *
 * Unlike space metadata (free-form key/values, kept for the scripting API and external modules), nobody but the
 * back writes this object: a client sends a SpaceStateQuery, the back applies it, then broadcasts the change as a
 * JSON Patch (RFC 6902). The pusher applies each patch to its own copy so a user joining the space gets the whole
 * state in InitSpaceUsersMessage.state; the front applies the same patches to its copy.
 *
 * Every collection a user can delete from is a Record keyed by id, never an array: a patch then targets
 * "/polls/<id>" rather than an index that shifts on every removal. `raisedHands` is the exception, because its
 * order is the information (the queue).
 *
 * Never store `undefined` in it: JSON has no such value, so a patch could not describe it. Delete the key instead.
 */

// Upper bounds, mirrored by the chat UI (ProximityChatRoom.pollCreation.limits / questionCreation.maxLength).
export const PROXIMITY_POLL_ID_MAX_LENGTH = 100;
export const PROXIMITY_POLL_QUESTION_MAX_LENGTH = 340;
export const PROXIMITY_POLL_ANSWER_TEXT_MAX_LENGTH = 240;
export const PROXIMITY_POLL_MAX_ANSWERS = 20;
export const PROXIMITY_POLL_SENDER_NAME_MAX_LENGTH = 256;
export const PROXIMITY_POLL_CLOSING_MESSAGE_MAX_LENGTH = 500;
export const PROXIMITY_QA_ID_MAX_LENGTH = 100;
export const PROXIMITY_QA_BODY_MAX_LENGTH = 500;
export const PROXIMITY_QA_SENDER_NAME_MAX_LENGTH = 256;

// Screen-share annotations (see screenAnnotationSchema).
export const SCREEN_ANNOTATION_TOOLS = ["pen", "line", "arrow", "rect", "text"] as const;
export const SCREEN_ANNOTATION_ID_MAX_LENGTH = 200;
export const SCREEN_ANNOTATION_MAX_WIDTH = 0.05;
export const SCREEN_ANNOTATION_MAX_POINTS = 5000;
export const SCREEN_ANNOTATION_TEXT_MAX_LENGTH = 500;
// Per shared screen: past it, the oldest elements are dropped to make room.
export const SCREEN_ANNOTATION_MAX_ELEMENTS = 500;

export const raisedHandEntrySchema = z.object({
    spaceUserId: z.string().min(1),
    name: z.string(),
    at: z.number().int(),
});

export const floorHolderEntrySchema = z.object({
    spaceUserId: z.string().min(1),
    name: z.string(),
});

export const recordingStatusSchema = z.enum(["idle", "starting", "recording", "stopping"]);

export const recordingStateSchema = z.object({
    recording: z.boolean(),
    recorder: z.string().nullable(),
    status: recordingStatusSchema,
});

export const proximityPollAnswerSchema = z.object({
    id: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    text: z.string().min(1).max(PROXIMITY_POLL_ANSWER_TEXT_MAX_LENGTH),
});

export const proximityPollVoteSchema = z.object({
    answerIds: z.array(z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH)).max(PROXIMITY_POLL_MAX_ANSWERS),
    updatedAt: z.number().int(),
});

// `senderId` and the vote keys are the user's "voter id": their uuid, or their spaceUserId when they have none.
export const proximityPollSchema = z.object({
    id: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    question: z.string().min(1).max(PROXIMITY_POLL_QUESTION_MAX_LENGTH),
    kind: z.enum(["open", "closed"]),
    answers: z.array(proximityPollAnswerSchema).min(2).max(PROXIMITY_POLL_MAX_ANSWERS),
    maxSelections: z.number().int().min(1).max(PROXIMITY_POLL_MAX_ANSWERS),
    senderId: z.string().min(1),
    senderName: z.string().max(PROXIMITY_POLL_SENDER_NAME_MAX_LENGTH).optional(),
    createdAt: z.number().int(),
    end: z
        .object({
            closingMessage: z.string().max(PROXIMITY_POLL_CLOSING_MESSAGE_MAX_LENGTH).optional(),
            closedAt: z.number().int(),
        })
        .optional(),
    votes: z.record(z.string(), proximityPollVoteSchema),
});

export const proximityQuestionSchema = z.object({
    id: z.string().min(1).max(PROXIMITY_QA_ID_MAX_LENGTH),
    body: z.string().min(1).max(PROXIMITY_QA_BODY_MAX_LENGTH),
    senderId: z.string().min(1),
    senderName: z.string().max(PROXIMITY_QA_SENDER_NAME_MAX_LENGTH).optional(),
    createdAt: z.number().int(),
    answer: z
        .object({
            moderatorId: z.string().min(1),
            answeredAt: z.number().int(),
        })
        .optional(),
    // voter id -> when they upvoted. Un-upvoting removes the key.
    upvotes: z.record(z.string(), z.number().int()),
});

// A finished element drawn on a shared screen. Coordinates are normalized (0..1) against the visible shared
// video, the width against its smallest side. The strokes being drawn are not in the state: they travel as
// ScreenAnnotationEvent drafts.
export const screenAnnotationElementSchema = z.object({
    id: z.string().min(1).max(SCREEN_ANNOTATION_ID_MAX_LENGTH),
    authorUserId: z.string().min(1),
    tool: z.enum(SCREEN_ANNOTATION_TOOLS),
    color: z.string().min(1).max(32),
    width: z.number().positive().max(SCREEN_ANNOTATION_MAX_WIDTH),
    points: z
        .array(z.object({ x: z.number().finite(), y: z.number().finite() }))
        .min(1)
        .max(SCREEN_ANNOTATION_MAX_POINTS),
    text: z.string().max(SCREEN_ANNOTATION_TEXT_MAX_LENGTH).optional(),
    // When the back stored it: the drawing order, and which elements go first past the limit.
    at: z.number().int(),
});

// The annotations of one shared screen, keyed in the state by the spaceUserId of the user sharing it.
export const screenAnnotationSchema = z.object({
    // The presenter lets the other members annotate.
    othersAllowed: z.boolean(),
    elements: z.record(z.string(), screenAnnotationElementSchema),
});

export const spaceStateSchema = z.object({
    // What the space is (bubble, meeting area, megaphone...), declared by the clients that join it. Absent until
    // the first one does: a space that never declares a kind is nobody's meeting, so the back measures nothing in it.
    kind: spaceKindSchema.optional(),
    raisedHands: z.array(raisedHandEntrySchema),
    floorHolders: z.array(floorHolderEntrySchema),
    recording: recordingStateSchema,
    polls: z.record(z.string(), proximityPollSchema),
    questions: z.record(z.string(), proximityQuestionSchema),
    // Absent from a state sent before annotations existed: defaults to none.
    annotations: z.record(z.string(), screenAnnotationSchema).default({}),
});

export type RaisedHandEntry = z.infer<typeof raisedHandEntrySchema>;
export type FloorHolderEntry = z.infer<typeof floorHolderEntrySchema>;
export type RecordingStatus = z.infer<typeof recordingStatusSchema>;
export type RecordingState = z.infer<typeof recordingStateSchema>;
export type ProximityPollAnswer = z.infer<typeof proximityPollAnswerSchema>;
export type ProximityPollVote = z.infer<typeof proximityPollVoteSchema>;
export type ProximityPoll = z.infer<typeof proximityPollSchema>;
export type ProximityQuestion = z.infer<typeof proximityQuestionSchema>;
export type ScreenAnnotationElementState = z.infer<typeof screenAnnotationElementSchema>;
export type ScreenAnnotationState = z.infer<typeof screenAnnotationSchema>;
export type SpaceState = z.infer<typeof spaceStateSchema>;

export function emptySpaceState(): SpaceState {
    return {
        raisedHands: [],
        floorHolders: [],
        recording: { recording: false, recorder: null, status: "idle" },
        polls: {},
        questions: {},
        annotations: {},
    };
}
