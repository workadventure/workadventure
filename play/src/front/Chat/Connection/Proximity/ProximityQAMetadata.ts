import { z } from "zod";

const PROXIMITY_QA_QUESTION_PREFIX = "proximityQaQuestion:";
const PROXIMITY_QA_UPVOTE_PREFIX = "proximityQaUpvote:";
const PROXIMITY_QA_ANSWER_PREFIX = "proximityQaAnswer:";
const PROXIMITY_QA_DELETE_PREFIX = "proximityQaDelete:";

export const proximityQAQuestionMetadataSchema = z.object({
    id: z.string().min(1),
    body: z.string().min(1),
    senderId: z.string().min(1),
    senderName: z.string().optional(),
    createdAt: z.number().int(),
});

export const proximityQAUpvoteMetadataSchema = z.object({
    questionId: z.string().min(1),
    voterId: z.string().min(1),
    upvoted: z.boolean(),
    updatedAt: z.number().int(),
});

export const proximityQAAnswerMetadataSchema = z.object({
    questionId: z.string().min(1),
    moderatorId: z.string().min(1),
    answeredAt: z.number().int(),
});

export const proximityQADeleteMetadataSchema = z.object({
    questionId: z.string().min(1),
    senderId: z.string().min(1),
    deletedAt: z.number().int(),
});

export type ProximityQAQuestionMetadata = z.infer<typeof proximityQAQuestionMetadataSchema>;
export type ProximityQAUpvoteMetadata = z.infer<typeof proximityQAUpvoteMetadataSchema>;
export type ProximityQAAnswerMetadata = z.infer<typeof proximityQAAnswerMetadataSchema>;
export type ProximityQADeleteMetadata = z.infer<typeof proximityQADeleteMetadataSchema>;

export type ParsedProximityQAMetadata = {
    questions: ProximityQAQuestionMetadata[];
    upvotes: ProximityQAUpvoteMetadata[];
    answers: ProximityQAAnswerMetadata[];
    deletions: ProximityQADeleteMetadata[];
};

export type ProximityQAState = {
    id: string;
    body: string;
    senderId: string;
    senderName: string | undefined;
    createdAt: number;
    isAnswered: boolean;
    upvoteCount: number;
    hasUpvoted: boolean;
    canUpvote: boolean;
    canDelete: boolean;
    canMarkAnswered: boolean;
};

export function getProximityQAQuestionMetadataKey(questionId: string): string {
    return `${PROXIMITY_QA_QUESTION_PREFIX}${questionId}`;
}

export function getProximityQAUpvoteMetadataKey(questionId: string, voterId: string): string {
    return `${PROXIMITY_QA_UPVOTE_PREFIX}${questionId}:${voterId}`;
}

export function getProximityQAAnswerMetadataKey(questionId: string): string {
    return `${PROXIMITY_QA_ANSWER_PREFIX}${questionId}`;
}

export function getProximityQADeleteMetadataKey(questionId: string): string {
    return `${PROXIMITY_QA_DELETE_PREFIX}${questionId}`;
}

export function parseProximityQAMetadata(metadata: Map<string, unknown>): ParsedProximityQAMetadata {
    const questions: ProximityQAQuestionMetadata[] = [];
    const upvotes: ProximityQAUpvoteMetadata[] = [];
    const answers: ProximityQAAnswerMetadata[] = [];
    const deletions: ProximityQADeleteMetadata[] = [];

    metadata.forEach((value, key) => {
        if (key.startsWith(PROXIMITY_QA_QUESTION_PREFIX)) {
            pushValidQAMetadata(value, proximityQAQuestionMetadataSchema, questions);
            return;
        }

        if (key.startsWith(PROXIMITY_QA_UPVOTE_PREFIX)) {
            pushValidQAMetadata(value, proximityQAUpvoteMetadataSchema, upvotes);
            return;
        }

        if (key.startsWith(PROXIMITY_QA_ANSWER_PREFIX)) {
            pushValidQAMetadata(value, proximityQAAnswerMetadataSchema, answers);
            return;
        }

        if (key.startsWith(PROXIMITY_QA_DELETE_PREFIX)) {
            pushValidQAMetadata(value, proximityQADeleteMetadataSchema, deletions);
        }
    });

    return {
        questions: questions.sort((left, right) => left.createdAt - right.createdAt),
        upvotes: upvotes.sort((left, right) => left.updatedAt - right.updatedAt),
        answers: answers.sort((left, right) => left.answeredAt - right.answeredAt),
        deletions: deletions.sort((left, right) => left.deletedAt - right.deletedAt),
    };
}

export function computeProximityQAState(
    question: ProximityQAQuestionMetadata,
    upvotes: ProximityQAUpvoteMetadata[],
    answer: ProximityQAAnswerMetadata | undefined,
    currentVoterId: string,
    canMarkAnswered: boolean,
    canDeleteAny = canMarkAnswered
): ProximityQAState {
    const latestUpvotesByUser = collectLatestUpvotes(question, upvotes);
    const activeUpvotes = Array.from(latestUpvotesByUser.values()).filter((upvote) => upvote.upvoted);
    const hasUpvoted = latestUpvotesByUser.get(currentVoterId)?.upvoted ?? false;
    const isAuthor = question.senderId === currentVoterId;
    const isAnswered = answer !== undefined;

    return {
        id: question.id,
        body: question.body,
        senderId: question.senderId,
        senderName: question.senderName,
        createdAt: question.createdAt,
        isAnswered,
        upvoteCount: activeUpvotes.length,
        hasUpvoted,
        canUpvote: !isAuthor && !isAnswered,
        canDelete: isAuthor || canDeleteAny,
        canMarkAnswered: canMarkAnswered && !isAnswered,
    };
}

export function isProximityQAQuestionDeleted(
    question: ProximityQAQuestionMetadata,
    deletions: ProximityQADeleteMetadata[]
): boolean {
    return deletions.some((deletion) => deletion.questionId === question.id);
}

function collectLatestUpvotes(
    question: ProximityQAQuestionMetadata,
    upvotes: ProximityQAUpvoteMetadata[]
): Map<string, ProximityQAUpvoteMetadata> {
    const latestUpvotesByUser = new Map<string, ProximityQAUpvoteMetadata>();

    for (const upvote of upvotes) {
        if (upvote.questionId !== question.id || upvote.voterId === question.senderId) {
            continue;
        }

        latestUpvotesByUser.set(upvote.voterId, upvote);
    }

    return latestUpvotesByUser;
}

function pushValidQAMetadata<T>(value: unknown, schema: z.ZodType<T>, target: T[]): void {
    const parsed = schema.safeParse(value);

    if (!parsed.success) {
        return;
    }

    target.push(parsed.data);
}
