import { randomUUID } from "node:crypto";
import type { SpaceStateQuery, SpaceUser } from "@workadventure/messages";
import type { ProximityPoll } from "@workadventure/shared-utils";
import {
    PROXIMITY_POLL_CLOSING_MESSAGE_MAX_LENGTH,
    PROXIMITY_POLL_SENDER_NAME_MAX_LENGTH,
    proximityPollSchema,
} from "@workadventure/shared-utils";
import type { SpaceStateHost } from "./SpaceStateHost";
import { voterIdOf } from "./SpaceStateHost";

export type ProximityPollQuery = Extract<
    NonNullable<SpaceStateQuery["query"]>,
    { $case: "createPoll" | "votePoll" | "closePoll" | "deletePoll" }
>;

/**
 * Owns the `polls` of a space's state. Ids and timestamps are generated here and every action is attributed to
 * the sender, so a client can neither impersonate someone nor vote on someone else's behalf.
 */
export class ProximityPollManager {
    constructor(private readonly space: SpaceStateHost) {}

    public handleQuery(sender: SpaceUser, query: ProximityPollQuery): void {
        switch (query.$case) {
            case "createPoll": {
                const { question, kind, answers, maxSelections } = query.createPoll;
                const poll: ProximityPoll = proximityPollSchema.parse({
                    id: randomUUID(),
                    question,
                    kind,
                    answers: answers.map((text) => ({ id: randomUUID(), text })),
                    maxSelections,
                    senderId: voterIdOf(sender),
                    senderName: sender.name.slice(0, PROXIMITY_POLL_SENDER_NAME_MAX_LENGTH),
                    createdAt: Date.now(),
                    votes: {},
                });
                if (poll.maxSelections > poll.answers.length) {
                    throw new Error("A poll cannot allow more selections than it has answers");
                }
                this.space.updateState((state) => {
                    state.polls[poll.id] = poll;
                });
                return;
            }
            case "votePoll": {
                const { pollId, answerIds } = query.votePoll;
                const poll = this.getPoll(pollId);
                if (poll.end) {
                    throw new Error("This poll is closed");
                }
                if (answerIds.length > poll.maxSelections) {
                    throw new Error("Poll vote selects more answers than the poll allows");
                }
                const validAnswerIds = new Set(poll.answers.map((answer) => answer.id));
                if (answerIds.some((answerId) => !validAnswerIds.has(answerId))) {
                    throw new Error("Poll vote references answers that do not belong to the poll");
                }
                const voterId = voterIdOf(sender);
                this.space.updateState((state) => {
                    const votes = state.polls[pollId].votes;
                    if (answerIds.length === 0) {
                        delete votes[voterId];
                    } else {
                        votes[voterId] = { answerIds: [...answerIds], updatedAt: Date.now() };
                    }
                });
                return;
            }
            case "closePoll": {
                const { pollId, closingMessage } = query.closePoll;
                const poll = this.getPoll(pollId);
                this.assertCreator(poll, sender, "Only poll creators can close a poll");
                if (poll.end) {
                    return;
                }
                if (closingMessage !== undefined && closingMessage.length > PROXIMITY_POLL_CLOSING_MESSAGE_MAX_LENGTH) {
                    throw new Error("The closing message is too long");
                }
                this.space.updateState((state) => {
                    state.polls[pollId].end =
                        closingMessage === undefined
                            ? { closedAt: Date.now() }
                            : { closingMessage, closedAt: Date.now() };
                });
                return;
            }
            case "deletePoll": {
                const { pollId } = query.deletePoll;
                this.assertCreator(this.getPoll(pollId), sender, "Only poll creators can delete a poll");
                this.space.updateState((state) => {
                    delete state.polls[pollId];
                });
                return;
            }
            default: {
                const _exhaustiveCheck: never = query;
            }
        }
    }

    private getPoll(pollId: string): Readonly<ProximityPoll> {
        const poll = this.space.getState().polls[pollId];
        if (!poll) {
            throw new Error(`Poll ${pollId} does not exist in this space`);
        }
        return poll;
    }

    private assertCreator(poll: Readonly<ProximityPoll>, sender: SpaceUser, message: string): void {
        if (poll.senderId !== voterIdOf(sender)) {
            throw new Error(message);
        }
    }
}
