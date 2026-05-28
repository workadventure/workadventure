import { asError } from "catch-unknown";
import { z } from "zod";

const PROXIMITY_QA_QUESTION_PREFIX = "proximityQaQuestion:";
const PROXIMITY_QA_UPVOTE_PREFIX = "proximityQaUpvote:";
const PROXIMITY_QA_ANSWER_PREFIX = "proximityQaAnswer:";
const PROXIMITY_QA_DELETE_PREFIX = "proximityQaDelete:";

const proximityQAQuestionMetadataSchema = z.object({
    id: z.string().min(1),
    body: z.string().min(1),
    senderId: z.string().min(1),
    senderName: z.string().optional(),
    createdAt: z.number().int(),
});

const proximityQAUpvoteMetadataSchema = z.object({
    questionId: z.string().min(1),
    voterId: z.string().min(1),
    upvoted: z.boolean(),
    updatedAt: z.number().int(),
});

const proximityQAAnswerMetadataSchema = z.object({
    questionId: z.string().min(1),
    moderatorId: z.string().min(1),
    answeredAt: z.number().int(),
});

const proximityQADeleteMetadataSchema = z.object({
    questionId: z.string().min(1),
    senderId: z.string().min(1),
    deletedAt: z.number().int(),
});

type ProximityQASpaceUser = {
    spaceUserId: string;
    uuid?: string;
    tags: string[];
    megaphoneState: boolean;
};
type SpaceWithMetadataLookup = {
    getUser: (spaceUserId: string) => ProximityQASpaceUser | undefined;
    getMetadataValue: (key: string) => unknown;
};
type ProximityQAQuestionMetadata = z.infer<typeof proximityQAQuestionMetadataSchema>;

export function processProximityQAMetadata(
    key: string,
    value: unknown,
    senderId: string,
    space: SpaceWithMetadataLookup
): Promise<unknown> {
    const sender = getSender(senderId, space);

    if (key.startsWith(PROXIMITY_QA_QUESTION_PREFIX)) {
        return resolveProcessedMetadata(() => processQuestion(key, value, sender));
    }

    if (key.startsWith(PROXIMITY_QA_UPVOTE_PREFIX)) {
        return resolveProcessedMetadata(() => processUpvote(key, value, sender, space));
    }

    if (key.startsWith(PROXIMITY_QA_ANSWER_PREFIX)) {
        return resolveProcessedMetadata(() => processAnswer(key, value, sender, space));
    }

    if (key.startsWith(PROXIMITY_QA_DELETE_PREFIX)) {
        return resolveProcessedMetadata(() => processDelete(key, value, sender, space));
    }

    return Promise.resolve(value);
}

export function isProximityQAMetadataKey(key: string): boolean {
    return (
        key.startsWith(PROXIMITY_QA_QUESTION_PREFIX) ||
        key.startsWith(PROXIMITY_QA_UPVOTE_PREFIX) ||
        key.startsWith(PROXIMITY_QA_ANSWER_PREFIX) ||
        key.startsWith(PROXIMITY_QA_DELETE_PREFIX)
    );
}

export const proximityQAMetadataPrefixes = [
    PROXIMITY_QA_QUESTION_PREFIX,
    PROXIMITY_QA_UPVOTE_PREFIX,
    PROXIMITY_QA_ANSWER_PREFIX,
    PROXIMITY_QA_DELETE_PREFIX,
] as const;

function processQuestion(key: string, value: unknown, sender: ProximityQASpaceUser): ProximityQAQuestionMetadata {
    const question = proximityQAQuestionMetadataSchema.parse(value);
    assertKeySuffix(key, PROXIMITY_QA_QUESTION_PREFIX, question.id, "Question metadata key does not match payload");
    assertSenderIdentity(question.senderId, sender, "Question sender does not match metadata sender");
    return question;
}

function processUpvote(
    key: string,
    value: unknown,
    sender: ProximityQASpaceUser,
    space: SpaceWithMetadataLookup
): unknown {
    const upvote = proximityQAUpvoteMetadataSchema.parse(value);
    assertKeySuffix(
        key,
        PROXIMITY_QA_UPVOTE_PREFIX,
        `${upvote.questionId}:${upvote.voterId}`,
        "Upvote metadata key does not match payload"
    );
    assertSenderIdentity(upvote.voterId, sender, "Upvote voter does not match metadata sender");

    const question = getQuestionMetadata(upvote.questionId, space);
    if (question.senderId === upvote.voterId) {
        throw new Error("Question authors cannot upvote their own question");
    }

    return upvote;
}

function processAnswer(
    key: string,
    value: unknown,
    sender: ProximityQASpaceUser,
    space: SpaceWithMetadataLookup
): unknown {
    const answer = proximityQAAnswerMetadataSchema.parse(value);
    assertKeySuffix(key, PROXIMITY_QA_ANSWER_PREFIX, answer.questionId, "Answer metadata key does not match payload");
    assertSenderIdentity(answer.moderatorId, sender, "Answer moderator does not match metadata sender");
    assertModerator(sender, "Only moderators can mark a question as answered");
    getQuestionMetadata(answer.questionId, space);
    return answer;
}

function processDelete(
    key: string,
    value: unknown,
    sender: ProximityQASpaceUser,
    space: SpaceWithMetadataLookup
): unknown {
    const deletion = proximityQADeleteMetadataSchema.parse(value);
    assertKeySuffix(key, PROXIMITY_QA_DELETE_PREFIX, deletion.questionId, "Delete metadata key does not match payload");
    assertSenderIdentity(deletion.senderId, sender, "Delete sender does not match metadata sender");

    const question = getQuestionMetadata(deletion.questionId, space);
    if (question.senderId !== deletion.senderId && !isAdmin(sender)) {
        throw new Error("Only question authors or admins can delete a question");
    }

    return deletion;
}

function getSender(senderId: string, space: SpaceWithMetadataLookup): ProximityQASpaceUser {
    const sender = space.getUser(senderId);
    if (!sender) {
        throw new Error("Metadata sender is not in the space");
    }
    return sender;
}

function getQuestionMetadata(questionId: string, space: SpaceWithMetadataLookup): ProximityQAQuestionMetadata {
    const question = proximityQAQuestionMetadataSchema.parse(
        space.getMetadataValue(`${PROXIMITY_QA_QUESTION_PREFIX}${questionId}`)
    );
    return question;
}

function assertSenderIdentity(valueSenderId: string, sender: ProximityQASpaceUser, message: string): void {
    if (valueSenderId === sender.spaceUserId || valueSenderId === sender.uuid) {
        return;
    }

    throw new Error(message);
}

function assertKeySuffix(key: string, prefix: string, expectedSuffix: string, message: string): void {
    if (key.slice(prefix.length) === expectedSuffix) {
        return;
    }

    throw new Error(message);
}

function assertModerator(sender: ProximityQASpaceUser, message: string): void {
    if (isModerator(sender)) {
        return;
    }

    throw new Error(message);
}

function isModerator(sender: ProximityQASpaceUser): boolean {
    return isAdmin(sender) || sender.megaphoneState;
}

function isAdmin(sender: ProximityQASpaceUser): boolean {
    return sender.tags.includes("admin");
}

function resolveProcessedMetadata(process: () => unknown): Promise<unknown> {
    try {
        return Promise.resolve(process());
    } catch (error) {
        return Promise.reject(asError(error));
    }
}
