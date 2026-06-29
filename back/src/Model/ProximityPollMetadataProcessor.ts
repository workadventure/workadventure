import { asError } from "catch-unknown";
import { z } from "zod";

const PROXIMITY_POLL_DEFINITION_PREFIX = "proximityPoll:";
const PROXIMITY_POLL_VOTE_PREFIX = "proximityPollVote:";
const PROXIMITY_POLL_END_PREFIX = "proximityPollEnd:";
const PROXIMITY_POLL_DELETE_PREFIX = "proximityPollDelete:";

// Upper bounds enforced server-side. They mirror the limits exposed by the
// frontend (ProximityChatRoom.pollCreation.limits) so a malicious client cannot
// bloat the broadcast space metadata with oversized payloads.
const PROXIMITY_POLL_ID_MAX_LENGTH = 100;
const PROXIMITY_POLL_QUESTION_MAX_LENGTH = 340;
const PROXIMITY_POLL_ANSWER_TEXT_MAX_LENGTH = 240;
const PROXIMITY_POLL_MAX_ANSWERS = 20;
const PROXIMITY_POLL_SENDER_NAME_MAX_LENGTH = 256;
const PROXIMITY_POLL_CLOSING_MESSAGE_MAX_LENGTH = 500;

const proximityPollAnswerMetadataSchema = z.object({
    id: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    text: z.string().min(1).max(PROXIMITY_POLL_ANSWER_TEXT_MAX_LENGTH),
});

const proximityPollDefinitionMetadataSchema = z.object({
    id: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    question: z.string().min(1).max(PROXIMITY_POLL_QUESTION_MAX_LENGTH),
    kind: z.enum(["open", "closed"]),
    answers: z.array(proximityPollAnswerMetadataSchema).min(2).max(PROXIMITY_POLL_MAX_ANSWERS),
    maxSelections: z.number().int().min(1).max(PROXIMITY_POLL_MAX_ANSWERS),
    senderId: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    senderName: z.string().max(PROXIMITY_POLL_SENDER_NAME_MAX_LENGTH).optional(),
    createdAt: z.number().int(),
});

const proximityPollVoteMetadataSchema = z.object({
    pollId: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    voterId: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    answerIds: z.array(z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH)).max(PROXIMITY_POLL_MAX_ANSWERS),
    updatedAt: z.number().int(),
});

const proximityPollEndMetadataSchema = z.object({
    pollId: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    senderId: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    closingMessage: z.string().max(PROXIMITY_POLL_CLOSING_MESSAGE_MAX_LENGTH).optional(),
    closedAt: z.number().int(),
});

const proximityPollDeleteMetadataSchema = z.object({
    pollId: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    senderId: z.string().min(1).max(PROXIMITY_POLL_ID_MAX_LENGTH),
    deletedAt: z.number().int(),
});

type ProximityPollSpaceUser = {
    spaceUserId: string;
    uuid?: string;
};
type SpaceWithMetadataLookup = {
    getUser: (spaceUserId: string) => ProximityPollSpaceUser | undefined;
    getMetadataValue: (key: string) => unknown;
};
type ProximityPollDefinitionMetadata = z.infer<typeof proximityPollDefinitionMetadataSchema>;

export function processProximityPollMetadata(
    key: string,
    value: unknown,
    senderId: string,
    space: SpaceWithMetadataLookup,
): Promise<unknown> {
    const sender = getSender(senderId, space);

    if (key.startsWith(PROXIMITY_POLL_DEFINITION_PREFIX)) {
        return resolveProcessedMetadata(() => processPollDefinition(key, value, sender));
    }

    if (key.startsWith(PROXIMITY_POLL_VOTE_PREFIX)) {
        return resolveProcessedMetadata(() => processVote(key, value, sender, space));
    }

    if (key.startsWith(PROXIMITY_POLL_END_PREFIX)) {
        return resolveProcessedMetadata(() => processEnd(key, value, sender, space));
    }

    if (key.startsWith(PROXIMITY_POLL_DELETE_PREFIX)) {
        return resolveProcessedMetadata(() => processDelete(key, value, sender, space));
    }

    return Promise.resolve(value);
}

export const proximityPollMetadataPrefixes = [
    PROXIMITY_POLL_DEFINITION_PREFIX,
    PROXIMITY_POLL_VOTE_PREFIX,
    PROXIMITY_POLL_END_PREFIX,
    PROXIMITY_POLL_DELETE_PREFIX,
] as const;

function processPollDefinition(
    key: string,
    value: unknown,
    sender: ProximityPollSpaceUser,
): ProximityPollDefinitionMetadata {
    const poll = proximityPollDefinitionMetadataSchema.parse(value);
    assertKeySuffix(key, PROXIMITY_POLL_DEFINITION_PREFIX, poll.id, "Poll metadata key does not match payload");
    assertSenderIdentity(poll.senderId, sender, "Poll sender does not match metadata sender");
    return poll;
}

function processVote(
    key: string,
    value: unknown,
    sender: ProximityPollSpaceUser,
    space: SpaceWithMetadataLookup,
): unknown {
    const vote = proximityPollVoteMetadataSchema.parse(value);
    assertKeySuffix(
        key,
        PROXIMITY_POLL_VOTE_PREFIX,
        `${vote.pollId}:${vote.voterId}`,
        "Poll vote metadata key does not match payload",
    );
    assertSenderIdentity(vote.voterId, sender, "Poll vote voter does not match metadata sender");

    const poll = getPollMetadata(vote.pollId, space);
    assertVoteWithinPoll(vote, poll);
    return vote;
}

function assertVoteWithinPoll(
    vote: z.infer<typeof proximityPollVoteMetadataSchema>,
    poll: ProximityPollDefinitionMetadata,
): void {
    if (vote.answerIds.length > poll.maxSelections) {
        throw new Error("Poll vote selects more answers than the poll allows");
    }

    const validAnswerIds = new Set(poll.answers.map((answer) => answer.id));
    if (vote.answerIds.some((answerId) => !validAnswerIds.has(answerId))) {
        throw new Error("Poll vote references answers that do not belong to the poll");
    }
}

function processEnd(
    key: string,
    value: unknown,
    sender: ProximityPollSpaceUser,
    space: SpaceWithMetadataLookup,
): unknown {
    const end = proximityPollEndMetadataSchema.parse(value);
    assertKeySuffix(key, PROXIMITY_POLL_END_PREFIX, end.pollId, "Poll end metadata key does not match payload");
    assertSenderIdentity(end.senderId, sender, "Poll end sender does not match metadata sender");

    const poll = getPollMetadata(end.pollId, space);
    if (poll.senderId !== end.senderId) {
        throw new Error("Only poll creators can close a poll");
    }

    return end;
}

function processDelete(
    key: string,
    value: unknown,
    sender: ProximityPollSpaceUser,
    space: SpaceWithMetadataLookup,
): unknown {
    const deletion = proximityPollDeleteMetadataSchema.parse(value);
    assertKeySuffix(
        key,
        PROXIMITY_POLL_DELETE_PREFIX,
        deletion.pollId,
        "Poll delete metadata key does not match payload",
    );
    assertSenderIdentity(deletion.senderId, sender, "Poll delete sender does not match metadata sender");

    const poll = getPollMetadata(deletion.pollId, space);
    if (poll.senderId !== deletion.senderId) {
        throw new Error("Only poll creators can delete a poll");
    }

    return deletion;
}

function getSender(senderId: string, space: SpaceWithMetadataLookup): ProximityPollSpaceUser {
    const sender = space.getUser(senderId);
    if (!sender) {
        throw new Error("Metadata sender is not in the space");
    }
    return sender;
}

function getPollMetadata(pollId: string, space: SpaceWithMetadataLookup): ProximityPollDefinitionMetadata {
    return proximityPollDefinitionMetadataSchema.parse(
        space.getMetadataValue(`${PROXIMITY_POLL_DEFINITION_PREFIX}${pollId}`),
    );
}

function assertSenderIdentity(valueSenderId: string, sender: ProximityPollSpaceUser, message: string): void {
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

function resolveProcessedMetadata(process: () => unknown): Promise<unknown> {
    try {
        return Promise.resolve(process());
    } catch (error) {
        return Promise.reject(asError(error));
    }
}
