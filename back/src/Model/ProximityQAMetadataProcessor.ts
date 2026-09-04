import { asError } from "catch-unknown";
import type {
    ProximityQAAnswerMetadata,
    ProximityQADeleteMetadata,
    ProximityQAQuestionMetadata,
    ProximityQAUpvoteMetadata,
    StoredSpaceMetadata,
} from "@workadventure/shared-utils";
import {
    PROXIMITY_QA_ANSWER_PREFIX,
    PROXIMITY_QA_DELETE_PREFIX,
    PROXIMITY_QA_QUESTION_PREFIX,
    PROXIMITY_QA_UPVOTE_PREFIX,
    getProximityQAQuestionMetadataKey,
} from "@workadventure/shared-utils";

// The payload shapes and their upper bounds live in the shared space-metadata catalogue
// (@workadventure/shared-utils/SpaceMetadata), which MetadataProcessor applies on reception. What is left
// here is the part only the server can decide: that the key matches the payload, that the sender is who they
// claim to be, and that they are allowed to act on the referenced question.

type ProximityQASpaceUser = {
    spaceUserId: string;
    uuid?: string;
    tags: string[];
    megaphoneState: boolean;
};
type SpaceWithMetadataLookup = {
    getUser: (spaceUserId: string) => ProximityQASpaceUser | undefined;
    getMetadataValue: <K extends string>(key: K) => StoredSpaceMetadata<K> | undefined;
};

export function isProximityQAMetadataKey(key: string): boolean {
    return (
        key.startsWith(PROXIMITY_QA_QUESTION_PREFIX) ||
        key.startsWith(PROXIMITY_QA_UPVOTE_PREFIX) ||
        key.startsWith(PROXIMITY_QA_ANSWER_PREFIX) ||
        key.startsWith(PROXIMITY_QA_DELETE_PREFIX)
    );
}

export function processProximityQAQuestionMetadata(
    key: `${typeof PROXIMITY_QA_QUESTION_PREFIX}${string}`,
    question: ProximityQAQuestionMetadata,
    senderId: string,
    space: SpaceWithMetadataLookup,
): Promise<unknown> {
    return resolveProcessedMetadata(() => {
        const sender = getSender(senderId, space);
        assertKeySuffix(key, PROXIMITY_QA_QUESTION_PREFIX, question.id, "Question metadata key does not match payload");
        assertSenderIdentity(question.senderId, sender, "Question sender does not match metadata sender");
        return question;
    });
}

export function processProximityQAUpvoteMetadata(
    key: `${typeof PROXIMITY_QA_UPVOTE_PREFIX}${string}`,
    upvote: ProximityQAUpvoteMetadata,
    senderId: string,
    space: SpaceWithMetadataLookup,
): Promise<unknown> {
    return resolveProcessedMetadata(() => {
        const sender = getSender(senderId, space);
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
    });
}

export function processProximityQAAnswerMetadata(
    key: `${typeof PROXIMITY_QA_ANSWER_PREFIX}${string}`,
    answer: ProximityQAAnswerMetadata,
    senderId: string,
    space: SpaceWithMetadataLookup,
): Promise<unknown> {
    return resolveProcessedMetadata(() => {
        const sender = getSender(senderId, space);
        assertKeySuffix(
            key,
            PROXIMITY_QA_ANSWER_PREFIX,
            answer.questionId,
            "Answer metadata key does not match payload",
        );
        assertSenderIdentity(answer.moderatorId, sender, "Answer moderator does not match metadata sender");
        assertModerator(sender, "Only moderators can mark a question as answered");
        getQuestionMetadata(answer.questionId, space);
        return answer;
    });
}

export function processProximityQADeleteMetadata(
    key: `${typeof PROXIMITY_QA_DELETE_PREFIX}${string}`,
    deletion: ProximityQADeleteMetadata,
    senderId: string,
    space: SpaceWithMetadataLookup,
): Promise<unknown> {
    return resolveProcessedMetadata(() => {
        const sender = getSender(senderId, space);
        assertKeySuffix(
            key,
            PROXIMITY_QA_DELETE_PREFIX,
            deletion.questionId,
            "Delete metadata key does not match payload",
        );
        assertSenderIdentity(deletion.senderId, sender, "Delete sender does not match metadata sender");

        const question = getQuestionMetadata(deletion.questionId, space);
        // The stored senderId may be either the author's spaceUserId or uuid, so match against the
        // current sender identity instead of the delete payload to avoid rejecting a legitimate author
        // who created the question with their other identifier.
        if (!isSenderIdentity(question.senderId, sender) && !isAdmin(sender)) {
            throw new Error("Only question authors or admins can delete a question");
        }

        return deletion;
    });
}

function getSender(senderId: string, space: SpaceWithMetadataLookup): ProximityQASpaceUser {
    const sender = space.getUser(senderId);
    if (!sender) {
        throw new Error("Metadata sender is not in the space");
    }
    return sender;
}

function getQuestionMetadata(questionId: string, space: SpaceWithMetadataLookup): ProximityQAQuestionMetadata {
    const question = space.getMetadataValue(getProximityQAQuestionMetadataKey(questionId));
    if (!question) {
        throw new Error(`Question ${questionId} does not exist in this space`);
    }
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
