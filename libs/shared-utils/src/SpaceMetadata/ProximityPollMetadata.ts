import { z } from "zod";

// A poll spreads over four key families, one entry per poll (and per voter for the votes), so the id travels
// in the key rather than in a single big value.
export const PROXIMITY_POLL_DEFINITION_PREFIX = "proximityPoll:";
export const PROXIMITY_POLL_VOTE_PREFIX = "proximityPollVote:";
export const PROXIMITY_POLL_END_PREFIX = "proximityPollEnd:";
export const PROXIMITY_POLL_DELETE_PREFIX = "proximityPollDelete:";

// Upper bounds enforced on both sides. They mirror the limits exposed by the frontend
// (ProximityChatRoom.pollCreation.limits) so a malicious client cannot bloat the broadcast space metadata
// with oversized payloads, and so the front never accepts what the back would reject.
export const PROXIMITY_POLL_ID_MAX_LENGTH = 100;
export const PROXIMITY_POLL_QUESTION_MAX_LENGTH = 340;
export const PROXIMITY_POLL_ANSWER_TEXT_MAX_LENGTH = 240;
export const PROXIMITY_POLL_MAX_ANSWERS = 20;
export const PROXIMITY_POLL_SENDER_NAME_MAX_LENGTH = 256;
export const PROXIMITY_POLL_CLOSING_MESSAGE_MAX_LENGTH = 500;

export const proximityPollAnswerMetadataSchema = z.object({
    id: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    text: z.string().min(1).max(PROXIMITY_POLL_ANSWER_TEXT_MAX_LENGTH),
});

export const proximityPollDefinitionMetadataSchema = z.object({
    id: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    question: z.string().min(1).max(PROXIMITY_POLL_QUESTION_MAX_LENGTH),
    kind: z.enum(["open", "closed"]),
    answers: z.array(proximityPollAnswerMetadataSchema).min(2).max(PROXIMITY_POLL_MAX_ANSWERS),
    maxSelections: z.number().int().min(1).max(PROXIMITY_POLL_MAX_ANSWERS),
    senderId: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    senderName: z.string().max(PROXIMITY_POLL_SENDER_NAME_MAX_LENGTH).optional(),
    createdAt: z.number().int(),
});

export const proximityPollVoteMetadataSchema = z.object({
    pollId: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    voterId: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    answerIds: z.array(z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH)).max(PROXIMITY_POLL_MAX_ANSWERS),
    updatedAt: z.number().int(),
});

export const proximityPollEndMetadataSchema = z.object({
    pollId: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    senderId: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    closingMessage: z.string().max(PROXIMITY_POLL_CLOSING_MESSAGE_MAX_LENGTH).optional(),
    closedAt: z.number().int(),
});

export const proximityPollDeleteMetadataSchema = z.object({
    pollId: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    senderId: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    deletedAt: z.number().int(),
});

export type ProximityPollAnswerMetadata = z.infer<typeof proximityPollAnswerMetadataSchema>;
export type ProximityPollDefinitionMetadata = z.infer<typeof proximityPollDefinitionMetadataSchema>;
export type ProximityPollVoteMetadata = z.infer<typeof proximityPollVoteMetadataSchema>;
export type ProximityPollEndMetadata = z.infer<typeof proximityPollEndMetadataSchema>;
export type ProximityPollDeleteMetadata = z.infer<typeof proximityPollDeleteMetadataSchema>;

export function getProximityPollDefinitionMetadataKey(
    pollId: string,
): `${typeof PROXIMITY_POLL_DEFINITION_PREFIX}${string}` {
    return `${PROXIMITY_POLL_DEFINITION_PREFIX}${pollId}`;
}

export function getProximityPollVoteMetadataKey(
    pollId: string,
    voterId: string,
): `${typeof PROXIMITY_POLL_VOTE_PREFIX}${string}` {
    return `${PROXIMITY_POLL_VOTE_PREFIX}${pollId}:${voterId}`;
}

export function getProximityPollEndMetadataKey(pollId: string): `${typeof PROXIMITY_POLL_END_PREFIX}${string}` {
    return `${PROXIMITY_POLL_END_PREFIX}${pollId}`;
}

export function getProximityPollDeleteMetadataKey(pollId: string): `${typeof PROXIMITY_POLL_DELETE_PREFIX}${string}` {
    return `${PROXIMITY_POLL_DELETE_PREFIX}${pollId}`;
}
