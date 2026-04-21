import type { MatrixEvent } from "matrix-js-sdk";
import { M_POLL_KIND_DISCLOSED, M_POLL_RESPONSE } from "matrix-js-sdk/lib/@types/polls";
import { PollResponseEvent } from "matrix-js-sdk/lib/extensible_events_v1/PollResponseEvent";
import type { PollStartEvent } from "matrix-js-sdk/lib/extensible_events_v1/PollStartEvent";
import type { ChatPollAnswer, ChatPollKind, ChatPollState } from "../ChatConnection";

type PollSelection = {
    answerIds: string[];
    spoiled: boolean;
};

export type ComputedPollState = ChatPollState & {
    winningAnswerText?: string;
};

export function getChatPollKind(pollStartEvent: PollStartEvent): ChatPollKind {
    return M_POLL_KIND_DISCLOSED.matches(pollStartEvent.rawKind) ? "open" : "closed";
}

export function getPollClosingMessage(endEvent?: MatrixEvent): string | undefined {
    if (!endEvent) {
        return undefined;
    }

    const content = endEvent.getContent();
    if (typeof content["m.text"] === "string") {
        return content["m.text"];
    }
    if (typeof content.body === "string") {
        return content.body;
    }
    return undefined;
}

export function computePollState(
    pollStartEvent: PollStartEvent,
    responseEvents: MatrixEvent[],
    options: {
        currentUserId?: string;
        isEnded: boolean;
        endEvent?: MatrixEvent;
        undecryptableRelationsCount?: number;
    }
): ComputedPollState {
    const pollKind = getChatPollKind(pollStartEvent);
    const selectionsByUser = collectLatestSelections(responseEvents, pollStartEvent);
    const mySelection = options.currentUserId ? selectionsByUser.get(options.currentUserId) : undefined;
    const activeSelections = Array.from(selectionsByUser.values()).filter(
        (selection) => !selection.spoiled && selection.answerIds.length > 0
    );
    const spoiledVotes = Array.from(selectionsByUser.values()).filter((selection) => selection.spoiled).length;
    const totalVotes = activeSelections.length;

    const answers: ChatPollAnswer[] = pollStartEvent.answers.map((answer) => {
        const votes = activeSelections.filter((selection) => selection.answerIds.includes(answer.id)).length;
        return {
            id: answer.id,
            text: answer.text,
            votes,
            percentage: totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100),
            isWinning: false,
        };
    });

    const maxVotes = Math.max(0, ...answers.map((answer) => answer.votes));
    const answersWithWinningFlags = answers.map((answer) => ({
        ...answer,
        isWinning: maxVotes > 0 && answer.votes === maxVotes,
    }));
    const winningAnswerText = answersWithWinningFlags.find((answer) => answer.isWinning)?.text;
    const hasVoted = !!mySelection && !mySelection.spoiled && mySelection.answerIds.length > 0;

    return {
        question: pollStartEvent.question.text,
        kind: pollKind,
        answers: answersWithWinningFlags,
        maxSelections: pollStartEvent.maxSelections,
        isEnded: options.isEnded,
        hasVoted,
        myAnswerIds: hasVoted ? mySelection.answerIds : [],
        resultsVisible: options.isEnded || (pollKind === "open" && hasVoted),
        totalVotes,
        spoiledVotes,
        closingMessage: getPollClosingMessage(options.endEvent),
        undecryptableRelationsCount: options.undecryptableRelationsCount ?? 0,
        winningAnswerText,
    };
}

function collectLatestSelections(
    responseEvents: MatrixEvent[],
    pollStartEvent: PollStartEvent
): Map<string, PollSelection> {
    const selectionsByUser = new Map<string, PollSelection>();
    const sortedResponses = [...responseEvents]
        .filter((event) => !event.isRedacted())
        .sort((left, right) => left.getTs() - right.getTs());

    for (const event of sortedResponses) {
        const sender = event.getSender();
        if (!sender) {
            continue;
        }

        selectionsByUser.set(sender, parseResponseEvent(event, pollStartEvent));
    }

    return selectionsByUser;
}

function parseResponseEvent(event: MatrixEvent, pollStartEvent: PollStartEvent): PollSelection {
    try {
        const rawContent = event.getContent();
        const rawResponse =
            (M_POLL_RESPONSE.name in rawContent && typeof rawContent[M_POLL_RESPONSE.name] === "object"
                ? rawContent[M_POLL_RESPONSE.name]
                : undefined) ??
            (M_POLL_RESPONSE.altName &&
            M_POLL_RESPONSE.altName in rawContent &&
            typeof rawContent[M_POLL_RESPONSE.altName] === "object"
                ? rawContent[M_POLL_RESPONSE.altName]
                : undefined);
        if (isEmptyPollResponse(rawResponse)) {
            return {
                answerIds: [],
                spoiled: false,
            };
        }

        const pollResponseEvent = new PollResponseEvent({
            type: event.getType(),
            content: event.getContent(),
        });
        pollResponseEvent.validateAgainst(pollStartEvent);

        return {
            answerIds: pollResponseEvent.answerIds,
            spoiled: pollResponseEvent.spoiled,
        };
    } catch {
        return {
            answerIds: [],
            spoiled: true,
        };
    }
}

function isEmptyPollResponse(rawResponse: unknown): boolean {
    if (!rawResponse || typeof rawResponse !== "object" || Array.isArray(rawResponse)) {
        return false;
    }

    if (!("answers" in rawResponse)) {
        return Object.keys(rawResponse).length === 0;
    }

    return rawResponse.answers == null || (Array.isArray(rawResponse.answers) && rawResponse.answers.length === 0);
}
