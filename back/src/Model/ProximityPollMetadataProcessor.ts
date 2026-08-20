import { asError } from "catch-unknown";
import type {
    ProximityPollDefinitionMetadata,
    ProximityPollDeleteMetadata,
    ProximityPollEndMetadata,
    ProximityPollVoteMetadata,
    StoredSpaceMetadata,
} from "@workadventure/shared-utils";
import {
    PROXIMITY_POLL_DEFINITION_PREFIX,
    PROXIMITY_POLL_DELETE_PREFIX,
    PROXIMITY_POLL_END_PREFIX,
    PROXIMITY_POLL_VOTE_PREFIX,
    getProximityPollDefinitionMetadataKey,
} from "@workadventure/shared-utils";

// The payload shapes and their upper bounds live in the shared space-metadata catalogue
// (@workadventure/shared-utils/SpaceMetadata), which MetadataProcessor applies on reception. What is left
// here is the part only the server can decide: that the key matches the payload, that the sender is who they
// claim to be, and that the action is allowed on the referenced poll.

type ProximityPollSpaceUser = {
    spaceUserId: string;
    uuid?: string;
};
type SpaceWithMetadataLookup = {
    getUser: (spaceUserId: string) => ProximityPollSpaceUser | undefined;
    getMetadataValue: <K extends string>(key: K) => StoredSpaceMetadata<K> | undefined;
};

export function processProximityPollDefinitionMetadata(
    key: `${typeof PROXIMITY_POLL_DEFINITION_PREFIX}${string}`,
    poll: ProximityPollDefinitionMetadata,
    senderId: string,
    space: SpaceWithMetadataLookup,
): Promise<unknown> {
    return resolveProcessedMetadata(() => {
        const sender = getSender(senderId, space);
        assertKeySuffix(key, PROXIMITY_POLL_DEFINITION_PREFIX, poll.id, "Poll metadata key does not match payload");
        assertSenderIdentity(poll.senderId, sender, "Poll sender does not match metadata sender");
        return poll;
    });
}

export function processProximityPollVoteMetadata(
    key: `${typeof PROXIMITY_POLL_VOTE_PREFIX}${string}`,
    vote: ProximityPollVoteMetadata,
    senderId: string,
    space: SpaceWithMetadataLookup,
): Promise<unknown> {
    return resolveProcessedMetadata(() => {
        const sender = getSender(senderId, space);
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
    });
}

export function processProximityPollEndMetadata(
    key: `${typeof PROXIMITY_POLL_END_PREFIX}${string}`,
    end: ProximityPollEndMetadata,
    senderId: string,
    space: SpaceWithMetadataLookup,
): Promise<unknown> {
    return resolveProcessedMetadata(() => {
        const sender = getSender(senderId, space);
        assertKeySuffix(key, PROXIMITY_POLL_END_PREFIX, end.pollId, "Poll end metadata key does not match payload");
        assertSenderIdentity(end.senderId, sender, "Poll end sender does not match metadata sender");

        const poll = getPollMetadata(end.pollId, space);
        // The stored senderId may be either the creator's spaceUserId or uuid, so match against the
        // current sender identity instead of the end payload to avoid rejecting a legitimate creator
        // who defined the poll with their other identifier.
        if (!isSenderIdentity(poll.senderId, sender)) {
            throw new Error("Only poll creators can close a poll");
        }

        return end;
    });
}

export function processProximityPollDeleteMetadata(
    key: `${typeof PROXIMITY_POLL_DELETE_PREFIX}${string}`,
    deletion: ProximityPollDeleteMetadata,
    senderId: string,
    space: SpaceWithMetadataLookup,
): Promise<unknown> {
    return resolveProcessedMetadata(() => {
        const sender = getSender(senderId, space);
        assertKeySuffix(
            key,
            PROXIMITY_POLL_DELETE_PREFIX,
            deletion.pollId,
            "Poll delete metadata key does not match payload",
        );
        assertSenderIdentity(deletion.senderId, sender, "Poll delete sender does not match metadata sender");

        const poll = getPollMetadata(deletion.pollId, space);
        // The stored senderId may be either the creator's spaceUserId or uuid, so match against the
        // current sender identity instead of the delete payload to avoid rejecting a legitimate creator
        // who defined the poll with their other identifier.
        if (!isSenderIdentity(poll.senderId, sender)) {
            throw new Error("Only poll creators can delete a poll");
        }

        return deletion;
    });
}

function assertVoteWithinPoll(vote: ProximityPollVoteMetadata, poll: ProximityPollDefinitionMetadata): void {
    if (vote.answerIds.length > poll.maxSelections) {
        throw new Error("Poll vote selects more answers than the poll allows");
    }

    const validAnswerIds = new Set(poll.answers.map((answer) => answer.id));
    if (vote.answerIds.some((answerId) => !validAnswerIds.has(answerId))) {
        throw new Error("Poll vote references answers that do not belong to the poll");
    }
}

function getSender(senderId: string, space: SpaceWithMetadataLookup): ProximityPollSpaceUser {
    const sender = space.getUser(senderId);
    if (!sender) {
        throw new Error("Metadata sender is not in the space");
    }
    return sender;
}

function getPollMetadata(pollId: string, space: SpaceWithMetadataLookup): ProximityPollDefinitionMetadata {
    const poll = space.getMetadataValue(getProximityPollDefinitionMetadataKey(pollId));
    if (!poll) {
        throw new Error(`Poll ${pollId} does not exist in this space`);
    }
    return poll;
}

function isSenderIdentity(valueSenderId: string, sender: ProximityPollSpaceUser): boolean {
    return valueSenderId === sender.spaceUserId || valueSenderId === sender.uuid;
}

function assertSenderIdentity(valueSenderId: string, sender: ProximityPollSpaceUser, message: string): void {
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

function resolveProcessedMetadata(process: () => unknown): Promise<unknown> {
    try {
        return Promise.resolve(process());
    } catch (error) {
        return Promise.reject(asError(error));
    }
}
