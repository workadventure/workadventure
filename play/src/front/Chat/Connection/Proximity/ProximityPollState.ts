import type { ProximityPoll } from "@workadventure/shared-utils";
import type { ChatPollState } from "../ChatConnection";

// Turns a poll of the space state (owned by the back, see ProximityPollManager) into what the chat UI renders.

export function sortByCreatedAt<T extends { createdAt: number }>(items: Readonly<Record<string, T>>): T[] {
    return Object.values(items).sort((left, right) => left.createdAt - right.createdAt);
}

export function computeProximityPollState(poll: ProximityPoll, currentVoterId: string): ChatPollState {
    // The back only stores valid votes (answers of this poll, within maxSelections).
    const mySelection = poll.votes[currentVoterId];
    const activeSelections = Object.values(poll.votes).filter((vote) => vote.answerIds.length > 0);
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
    const hasVoted = !!mySelection && mySelection.answerIds.length > 0;
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
        spoiledVotes: 0,
        closingMessage: poll.end?.closingMessage,
        undecryptableRelationsCount: 0,
    };
}
