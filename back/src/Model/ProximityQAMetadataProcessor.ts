import { asError } from "catch-unknown";
import { z } from "zod";

const PROXIMITY_QA_QUESTION_PREFIX = "proximityQaQuestion:";
const PROXIMITY_QA_UPVOTE_PREFIX = "proximityQaUpvote:";
const PROXIMITY_QA_ANSWER_PREFIX = "proximityQaAnswer:";
const PROXIMITY_QA_DELETE_PREFIX = "proximityQaDelete:";

// Upper bounds enforced server-side. They mirror the limit exposed by the
// frontend (ProximityChatRoom.questionCreation.maxLength) so a malicious client
// cannot bloat the broadcast space metadata with oversized payloads.
const PROXIMITY_QA_ID_MAX_LENGTH = 100;
const PROXIMITY_QA_BODY_MAX_LENGTH = 500;
const PROXIMITY_QA_SENDER_NAME_MAX_LENGTH = 256;

const proximityQAQuestionMetadataSchema = z.object({
    id: z.string().min(1).max(PROXIMITY_QA_ID_MAX_LENGTH),
    body: z.string().min(1).max(PROXIMITY_QA_BODY_MAX_LENGTH),
    senderId: z.string().min(1).max(PROXIMITY_QA_ID_MAX_LENGTH),
    senderName: z.string().max(PROXIMITY_QA_SENDER_NAME_MAX_LENGTH).optional(),
    createdAt: z.number().int(),
});

const proximityQAUpvoteMetadataSchema = z.object({
    questionId: z.string().min(1).max(PROXIMITY_QA_ID_MAX_LENGTH),
    voterId: z.string().min(1).max(PROXIMITY_QA_ID_MAX_LENGTH),
    upvoted: z.boolean(),
    updatedAt: z.number().int(),
});

const proximityQAAnswerMetadataSchema = z.object({
    questionId: z.string().min(1).max(PROXIMITY_QA_ID_MAX_LENGTH),
    moderatorId: z.string().min(1).max(PROXIMITY_QA_ID_MAX_LENGTH),
    answeredAt: z.number().int(),
});

const proximityQADeleteMetadataSchema = z.object({
    questionId: z.string().min(1).max(PROXIMITY_QA_ID_MAX_LENGTH),
    senderId: z.string().min(1).max(PROXIMITY_QA_ID_MAX_LENGTH),
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
    space: SpaceWithMetadataLookup,
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
    space: SpaceWithMetadataLookup,
): unknown {
    const upvote = proximityQAUpvoteMetadataSchema.parse(value);
    assertKeySuffix(
        key,
        PROXIMITY_QA_UPVOTE_PREFIX,
        `${upvote.questionId}:${upvote.voterId}`,
        "Upvote metadata key does not match payload",
    );
    assertSenderIdentity(upvote.voterId, sender, "Upvote voter does not match metadata sender");

    const question = getQuestionMetadata(upvote.questionId, space);
    // The stored senderId may be either the author's spaceUserId or uuid, so compare against the
    // current sender identity rather than the upvote payload to catch self-upvotes made with the
    // author's other identifier.
    if (isSenderIdentity(question.senderId, sender)) {
        throw new Error("Question authors cannot upvote their own question");
    }

    return upvote;
}

function processAnswer(
    key: string,
    value: unknown,
    sender: ProximityQASpaceUser,
    space: SpaceWithMetadataLookup,
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
    space: SpaceWithMetadataLookup,
): unknown {
    const deletion = proximityQADeleteMetadataSchema.parse(value);
    assertKeySuffix(key, PROXIMITY_QA_DELETE_PREFIX, deletion.questionId, "Delete metadata key does not match payload");
    assertSenderIdentity(deletion.senderId, sender, "Delete sender does not match metadata sender");

    const question = getQuestionMetadata(deletion.questionId, space);
    // The stored senderId may be either the author's spaceUserId or uuid, so match against the
    // current sender identity instead of the delete payload to avoid rejecting a legitimate author
    // who created the question with their other identifier.
    if (!isSenderIdentity(question.senderId, sender) && !isAdmin(sender)) {
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
        space.getMetadataValue(`${PROXIMITY_QA_QUESTION_PREFIX}${questionId}`),
    );
    return question;
}

function isSenderIdentity(valueSenderId: string, sender: ProximityQASpaceUser): boolean {
    return valueSenderId === sender.spaceUserId || valueSenderId === sender.uuid;
}

function assertSenderIdentity(valueSenderId: string, sender: ProximityQASpaceUser, message: string): void {
    if (isSenderIdentity(valueSenderId, sender)) {
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
