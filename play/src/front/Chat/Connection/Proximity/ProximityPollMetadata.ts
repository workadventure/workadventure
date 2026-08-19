import type { z } from "zod";
import {
    PROXIMITY_POLL_DEFINITION_PREFIX,
    PROXIMITY_POLL_DELETE_PREFIX,
    PROXIMITY_POLL_END_PREFIX,
    PROXIMITY_POLL_VOTE_PREFIX,
    proximityPollDefinitionMetadataSchema,
    proximityPollDeleteMetadataSchema,
    proximityPollEndMetadataSchema,
    proximityPollVoteMetadataSchema,
} from "@workadventure/shared-utils";
import type { ChatPollKind, ChatPollState } from "../ChatConnection";

// The keys, the payload shapes and their upper bounds live in the shared space-metadata catalogue
// (@workadventure/shared-utils), which is what the back validates incoming metadata against -- so the front
// never accepts something the server would have rejected, nor builds something it would reject. What stays
// here is the presentation side: turning the raw metadata into the poll state the chat UI renders.
export {
    PROXIMITY_POLL_DEFINITION_PREFIX,
    PROXIMITY_POLL_DELETE_PREFIX,
    PROXIMITY_POLL_END_PREFIX,
    PROXIMITY_POLL_VOTE_PREFIX,
    getProximityPollDefinitionMetadataKey,
    getProximityPollDeleteMetadataKey,
    getProximityPollEndMetadataKey,
    getProximityPollVoteMetadataKey,
    proximityPollDefinitionMetadataSchema,
    proximityPollDeleteMetadataSchema,
    proximityPollEndMetadataSchema,
    proximityPollVoteMetadataSchema,
} from "@workadventure/shared-utils";
export type {
    ProximityPollAnswerMetadata,
    ProximityPollDefinitionMetadata,
    ProximityPollDeleteMetadata,
    ProximityPollEndMetadata,
    ProximityPollVoteMetadata,
} from "@workadventure/shared-utils";

type ProximityPollDefinitionMetadata = z.infer<typeof proximityPollDefinitionMetadataSchema>;
type ProximityPollVoteMetadata = z.infer<typeof proximityPollVoteMetadataSchema>;
type ProximityPollEndMetadata = z.infer<typeof proximityPollEndMetadataSchema>;
type ProximityPollDeleteMetadata = z.infer<typeof proximityPollDeleteMetadataSchema>;

export type ParsedProximityPollMetadata = {
    polls: ProximityPollDefinitionMetadata[];
    votes: ProximityPollVoteMetadata[];
    ends: ProximityPollEndMetadata[];
    deletions: ProximityPollDeleteMetadata[];
};

type PollSelection = {
    answerIds: string[];
    spoiled: boolean;
};

export function parseProximityPollMetadata(metadata: Map<string, unknown>): ParsedProximityPollMetadata {
    const polls: ProximityPollDefinitionMetadata[] = [];
    const votes: ProximityPollVoteMetadata[] = [];
    const ends: ProximityPollEndMetadata[] = [];
    const deletions: ProximityPollDeleteMetadata[] = [];

    metadata.forEach((value, key) => {
        if (key.startsWith(PROXIMITY_POLL_DEFINITION_PREFIX)) {
            pushValidPollMetadata(value, proximityPollDefinitionMetadataSchema, polls);
            return;
        }

        if (key.startsWith(PROXIMITY_POLL_VOTE_PREFIX)) {
            pushValidPollMetadata(value, proximityPollVoteMetadataSchema, votes);
            return;
        }

        if (key.startsWith(PROXIMITY_POLL_END_PREFIX)) {
            pushValidPollMetadata(value, proximityPollEndMetadataSchema, ends);
            return;
        }

        if (key.startsWith(PROXIMITY_POLL_DELETE_PREFIX)) {
            pushValidPollMetadata(value, proximityPollDeleteMetadataSchema, deletions);
        }
    });

    return {
        polls: polls.sort((left, right) => left.createdAt - right.createdAt),
        votes: votes.sort((left, right) => left.updatedAt - right.updatedAt),
        ends: ends.sort((left, right) => left.closedAt - right.closedAt),
        deletions: deletions.sort((left, right) => left.deletedAt - right.deletedAt),
    };
}

export function computeProximityPollState(
    poll: ProximityPollDefinitionMetadata,
    votes: ProximityPollVoteMetadata[],
    end: ProximityPollEndMetadata | undefined,
    currentVoterId: string,
): ChatPollState {
    const selectionsByUser = collectLatestSelections(poll, votes);
    const mySelection = selectionsByUser.get(currentVoterId);
    const activeSelections = Array.from(selectionsByUser.values()).filter(
        (selection) => !selection.spoiled && selection.answerIds.length > 0,
    );
    const spoiledVotes = Array.from(selectionsByUser.values()).filter((selection) => selection.spoiled).length;
    const totalVotes = activeSelections.length;
    const answers = poll.answers.map((answer) => {
        const answerVotes = activeSelections.filter((selection) => selection.answerIds.includes(answer.id)).length;

        return {
            id: answer.id,
            text: answer.text,
            votes: answerVotes,
            percentage: totalVotes === 0 ? 0 : Math.round((answerVotes / totalVotes) * 100),
            isWinning: false,
        };
    });
    const maxVotes = Math.max(0, ...answers.map((answer) => answer.votes));
    const answersWithWinningFlags = answers.map((answer) => ({
        ...answer,
        isWinning: maxVotes > 0 && answer.votes === maxVotes,
    }));
    const hasVoted = !!mySelection && !mySelection.spoiled && mySelection.answerIds.length > 0;
    const isEnded = end !== undefined;

    return {
        question: poll.question,
        kind: poll.kind,
        answers: answersWithWinningFlags,
        maxSelections: poll.maxSelections,
        isEnded,
        hasVoted,
        myAnswerIds: hasVoted && mySelection ? mySelection.answerIds : [],
        resultsVisible: isEnded || (poll.kind === "open" && hasVoted),
        totalVotes,
        spoiledVotes,
        closingMessage: end?.closingMessage,
        undecryptableRelationsCount: 0,
    };
}

export function isProximityPollDeleted(
    poll: ProximityPollDefinitionMetadata,
    deletions: ProximityPollDeleteMetadata[],
): boolean {
    return deletions.some((deletion) => deletion.pollId === poll.id && deletion.senderId === poll.senderId);
}

export function getProximityPollKind(kind: ChatPollKind): ChatPollKind {
    return kind;
}

function pushValidPollMetadata<T>(value: unknown, schema: z.ZodType<T>, target: T[]): void {
    const parsed = schema.safeParse(value);

    if (!parsed.success) {
        return;
    }

    target.push(parsed.data);
}

function collectLatestSelections(
    poll: ProximityPollDefinitionMetadata,
    votes: ProximityPollVoteMetadata[],
): Map<string, PollSelection> {
    const validAnswerIds = new Set(poll.answers.map((answer) => answer.id));
    const selectionsByUser = new Map<string, PollSelection>();

    for (const vote of votes) {
        if (vote.pollId !== poll.id) {
            continue;
        }

        selectionsByUser.set(vote.voterId, parseVoteSelection(vote, validAnswerIds, poll.maxSelections));
    }

    return selectionsByUser;
}

function parseVoteSelection(
    vote: ProximityPollVoteMetadata,
    validAnswerIds: Set<string>,
    maxSelections: number,
): PollSelection {
    const hasInvalidAnswer = vote.answerIds.some((answerId) => !validAnswerIds.has(answerId));
    const hasTooManyAnswers = vote.answerIds.length > maxSelections;

    if (hasInvalidAnswer || hasTooManyAnswers) {
        return {
            answerIds: [],
            spoiled: true,
        };
    }

    return {
        answerIds: vote.answerIds,
        spoiled: false,
    };
}
