import { z } from "zod";
import type { ChatPollKind, ChatPollState } from "../ChatConnection";

const PROXIMITY_POLL_DEFINITION_PREFIX = "proximityPoll:";
const PROXIMITY_POLL_VOTE_PREFIX = "proximityPollVote:";
const PROXIMITY_POLL_END_PREFIX = "proximityPollEnd:";
const PROXIMITY_POLL_DELETE_PREFIX = "proximityPollDelete:";

const proximityPollAnswerMetadataSchema = z.object({
    id: z.string().min(1),
    text: z.string().min(1),
});

export const proximityPollDefinitionMetadataSchema = z.object({
    id: z.string().min(1),
    question: z.string().min(1),
    kind: z.enum(["open", "closed"]),
    answers: z.array(proximityPollAnswerMetadataSchema).min(2),
    maxSelections: z.number().int().min(1),
    senderId: z.string().min(1),
    senderName: z.string().optional(),
    createdAt: z.number().int(),
});

export const proximityPollVoteMetadataSchema = z.object({
    pollId: z.string().min(1),
    voterId: z.string().min(1),
    answerIds: z.array(z.string().min(1)),
    updatedAt: z.number().int(),
});

export const proximityPollEndMetadataSchema = z.object({
    pollId: z.string().min(1),
    senderId: z.string().min(1),
    closingMessage: z.string().optional(),
    closedAt: z.number().int(),
});

export const proximityPollDeleteMetadataSchema = z.object({
    pollId: z.string().min(1),
    senderId: z.string().min(1),
    deletedAt: z.number().int(),
});

export type ProximityPollAnswerMetadata = z.infer<typeof proximityPollAnswerMetadataSchema>;
export type ProximityPollDefinitionMetadata = z.infer<typeof proximityPollDefinitionMetadataSchema>;
export type ProximityPollVoteMetadata = z.infer<typeof proximityPollVoteMetadataSchema>;
export type ProximityPollEndMetadata = z.infer<typeof proximityPollEndMetadataSchema>;
export type ProximityPollDeleteMetadata = z.infer<typeof proximityPollDeleteMetadataSchema>;

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

export function getProximityPollDefinitionMetadataKey(pollId: string): string {
    return `${PROXIMITY_POLL_DEFINITION_PREFIX}${pollId}`;
}

export function getProximityPollVoteMetadataKey(pollId: string, voterId: string): string {
    return `${PROXIMITY_POLL_VOTE_PREFIX}${pollId}:${voterId}`;
}

export function getProximityPollEndMetadataKey(pollId: string): string {
    return `${PROXIMITY_POLL_END_PREFIX}${pollId}`;
}

export function getProximityPollDeleteMetadataKey(pollId: string): string {
    return `${PROXIMITY_POLL_DELETE_PREFIX}${pollId}`;
}

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
