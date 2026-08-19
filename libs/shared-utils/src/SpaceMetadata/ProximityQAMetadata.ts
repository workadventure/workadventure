import { z } from "zod";

// Like polls, a Q&A spreads over four key families, one entry per question (and per voter for the upvotes).
export const PROXIMITY_QA_QUESTION_PREFIX = "proximityQaQuestion:";
export const PROXIMITY_QA_UPVOTE_PREFIX = "proximityQaUpvote:";
export const PROXIMITY_QA_ANSWER_PREFIX = "proximityQaAnswer:";
export const PROXIMITY_QA_DELETE_PREFIX = "proximityQaDelete:";

// Upper bounds enforced on both sides. They mirror the limit exposed by the frontend
// (ProximityChatRoom.questionCreation.maxLength) so a malicious client cannot bloat the broadcast space
// metadata with oversized payloads, and so the front never accepts what the back would reject.
export const PROXIMITY_QA_ID_MAX_LENGTH = 100;
export const PROXIMITY_QA_BODY_MAX_LENGTH = 500;
export const PROXIMITY_QA_SENDER_NAME_MAX_LENGTH = 256;

export const proximityQAQuestionMetadataSchema = z.object({
    id: z.string().min(1).max(PROXIMITY_QA_ID_MAX_LENGTH),
    body: z.string().min(1).max(PROXIMITY_QA_BODY_MAX_LENGTH),
    senderId: z.string().min(1).max(PROXIMITY_QA_ID_MAX_LENGTH),
    senderName: z.string().max(PROXIMITY_QA_SENDER_NAME_MAX_LENGTH).optional(),
    createdAt: z.number().int(),
});

export const proximityQAUpvoteMetadataSchema = z.object({
    questionId: z.string().min(1).max(PROXIMITY_QA_ID_MAX_LENGTH),
    voterId: z.string().min(1).max(PROXIMITY_QA_ID_MAX_LENGTH),
    upvoted: z.boolean(),
    updatedAt: z.number().int(),
});

export const proximityQAAnswerMetadataSchema = z.object({
    questionId: z.string().min(1).max(PROXIMITY_QA_ID_MAX_LENGTH),
    moderatorId: z.string().min(1).max(PROXIMITY_QA_ID_MAX_LENGTH),
    answeredAt: z.number().int(),
});

export const proximityQADeleteMetadataSchema = z.object({
    questionId: z.string().min(1).max(PROXIMITY_QA_ID_MAX_LENGTH),
    senderId: z.string().min(1).max(PROXIMITY_QA_ID_MAX_LENGTH),
    deletedAt: z.number().int(),
});

export type ProximityQAQuestionMetadata = z.infer<typeof proximityQAQuestionMetadataSchema>;
export type ProximityQAUpvoteMetadata = z.infer<typeof proximityQAUpvoteMetadataSchema>;
export type ProximityQAAnswerMetadata = z.infer<typeof proximityQAAnswerMetadataSchema>;
export type ProximityQADeleteMetadata = z.infer<typeof proximityQADeleteMetadataSchema>;

export function getProximityQAQuestionMetadataKey(
    questionId: string,
): `${typeof PROXIMITY_QA_QUESTION_PREFIX}${string}` {
    return `${PROXIMITY_QA_QUESTION_PREFIX}${questionId}`;
}

export function getProximityQAUpvoteMetadataKey(
    questionId: string,
    voterId: string,
): `${typeof PROXIMITY_QA_UPVOTE_PREFIX}${string}` {
    return `${PROXIMITY_QA_UPVOTE_PREFIX}${questionId}:${voterId}`;
}

export function getProximityQAAnswerMetadataKey(questionId: string): `${typeof PROXIMITY_QA_ANSWER_PREFIX}${string}` {
    return `${PROXIMITY_QA_ANSWER_PREFIX}${questionId}`;
}

export function getProximityQADeleteMetadataKey(questionId: string): `${typeof PROXIMITY_QA_DELETE_PREFIX}${string}` {
    return `${PROXIMITY_QA_DELETE_PREFIX}${questionId}`;
}
