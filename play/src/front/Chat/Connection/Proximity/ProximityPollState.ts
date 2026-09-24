import type { ProximityPoll } from "@workadventure/shared-utils";
import type { ChatPollState } from "../ChatConnection";

// Turns a poll of the space state (owned by the back, see ProximityPollManager) into what the chat UI renders.

type PollSelection = {
    answerIds: string[];
    spoiled: boolean;
};

export function sortProximityPolls(polls: Readonly<Record<string, ProximityPoll>>): ProximityPoll[] {
    return Object.values(polls).sort((left, right) => left.createdAt - right.createdAt);
}

export function computeProximityPollState(poll: ProximityPoll, currentVoterId: string): ChatPollState {
    const selectionsByUser = collectSelections(poll);
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
    const isEnded = poll.end !== undefined;

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
        closingMessage: poll.end?.closingMessage,
        undecryptableRelationsCount: 0,
    };
}

// The back refuses invalid votes; counting one as spoiled only guards against a state we did not expect.
function collectSelections(poll: ProximityPoll): Map<string, PollSelection> {
    const validAnswerIds = new Set(poll.answers.map((answer) => answer.id));
    const selectionsByUser = new Map<string, PollSelection>();

    for (const [voterId, vote] of Object.entries(poll.votes)) {
        const spoiled =
            vote.answerIds.some((answerId) => !validAnswerIds.has(answerId)) ||
            vote.answerIds.length > poll.maxSelections;
        selectionsByUser.set(voterId, spoiled ? { answerIds: [], spoiled } : { answerIds: vote.answerIds, spoiled });
    }

    return selectionsByUser;
}
