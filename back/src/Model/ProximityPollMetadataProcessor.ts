import { asError } from "catch-unknown";
import { z } from "zod";

const PROXIMITY_POLL_DEFINITION_PREFIX = "proximityPoll:";
const PROXIMITY_POLL_VOTE_PREFIX = "proximityPollVote:";
const PROXIMITY_POLL_END_PREFIX = "proximityPollEnd:";
const PROXIMITY_POLL_DELETE_PREFIX = "proximityPollDelete:";

const proximityPollAnswerMetadataSchema = z.object({
    id: z.string().min(1),
    text: z.string().min(1),
});

const proximityPollDefinitionMetadataSchema = z.object({
    id: z.string().min(1),
    question: z.string().min(1),
    kind: z.enum(["open", "closed"]),
    answers: z.array(proximityPollAnswerMetadataSchema).min(2),
    maxSelections: z.number().int().min(1),
    senderId: z.string().min(1),
    senderName: z.string().optional(),
    createdAt: z.number().int(),
});

const proximityPollVoteMetadataSchema = z.object({
    pollId: z.string().min(1),
    voterId: z.string().min(1),
    answerIds: z.array(z.string().min(1)),
    updatedAt: z.number().int(),
});

const proximityPollEndMetadataSchema = z.object({
    pollId: z.string().min(1),
    senderId: z.string().min(1),
    closingMessage: z.string().optional(),
    closedAt: z.number().int(),
});

const proximityPollDeleteMetadataSchema = z.object({
    pollId: z.string().min(1),
    senderId: z.string().min(1),
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
    getPollMetadata(vote.pollId, space);
    return vote;
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
