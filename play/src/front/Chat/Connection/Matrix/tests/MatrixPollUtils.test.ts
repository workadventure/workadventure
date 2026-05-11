import { describe, expect, it } from "vitest";
import { MatrixEvent } from "matrix-js-sdk";
import { M_POLL_KIND_DISCLOSED, M_POLL_KIND_UNDISCLOSED, M_POLL_RESPONSE } from "matrix-js-sdk/lib/@types/polls";
import { PollEndEvent } from "matrix-js-sdk/lib/extensible_events_v1/PollEndEvent";
import { PollResponseEvent } from "matrix-js-sdk/lib/extensible_events_v1/PollResponseEvent";
import { PollStartEvent } from "matrix-js-sdk/lib/extensible_events_v1/PollStartEvent";
import type { IPartialEvent } from "matrix-js-sdk/lib/@types/extensible_events";
import { computePollState } from "../MatrixPollUtils";

describe("MatrixPollUtils", () => {
    it("shows results for an open poll after the current user has voted", () => {
        const pollStart = PollStartEvent.from("Best fruit?", ["Apple", "Banana"], M_POLL_KIND_DISCLOSED);
        const [appleAnswer, bananaAnswer] = pollStart.answers;
        const response = createMatrixPollResponse(
            PollResponseEvent.from([bananaAnswer.id], "$poll").serialize(),
            "@alice:server",
            2
        );

        const state = computePollState(pollStart, [response], {
            currentUserId: "@alice:server",
            isEnded: false,
        });

        expect(state.kind).toBe("open");
        expect(state.hasVoted).toBe(true);
        expect(state.resultsVisible).toBe(true);
        expect(state.totalVotes).toBe(1);
        expect(state.answers.find((answer) => answer.id === bananaAnswer.id)?.votes).toBe(1);
        expect(state.answers.find((answer) => answer.id === appleAnswer.id)?.votes).toBe(0);
    });

    it("keeps results hidden for a closed poll until it ends", () => {
        const pollStart = PollStartEvent.from("Best fruit?", ["Apple", "Banana"], M_POLL_KIND_UNDISCLOSED);
        const [bananaAnswer] = pollStart.answers.slice(1);
        const response = createMatrixPollResponse(
            PollResponseEvent.from([bananaAnswer.id], "$poll").serialize(),
            "@alice:server",
            2
        );

        const stateBeforeEnd = computePollState(pollStart, [response], {
            currentUserId: "@alice:server",
            isEnded: false,
        });
        const endEvent = createMatrixEvent(PollEndEvent.from("$poll", "Poll closed").serialize(), "@alice:server", 3);
        const stateAfterEnd = computePollState(pollStart, [response], {
            currentUserId: "@alice:server",
            isEnded: true,
            endEvent,
        });

        expect(stateBeforeEnd.kind).toBe("closed");
        expect(stateBeforeEnd.resultsVisible).toBe(false);
        expect(stateAfterEnd.resultsVisible).toBe(true);
        expect(stateAfterEnd.closingMessage).toBe("Poll closed");
    });

    it("keeps only the latest valid response per sender", () => {
        const pollStart = PollStartEvent.from("Best fruit?", ["Apple", "Banana"], M_POLL_KIND_DISCLOSED);
        const [appleAnswer, bananaAnswer] = pollStart.answers;
        const firstResponse = createMatrixPollResponse(
            PollResponseEvent.from([appleAnswer.id], "$poll").serialize(),
            "@alice:server",
            2
        );
        const secondResponse = createMatrixPollResponse(
            PollResponseEvent.from([bananaAnswer.id], "$poll").serialize(),
            "@alice:server",
            3
        );

        const state = computePollState(pollStart, [firstResponse, secondResponse], {
            currentUserId: "@alice:server",
            isEnded: false,
        });

        expect(state.myAnswerIds).toEqual([bananaAnswer.id]);
        expect(state.answers.find((answer) => answer.id === appleAnswer.id)?.votes).toBe(0);
        expect(state.answers.find((answer) => answer.id === bananaAnswer.id)?.votes).toBe(1);
    });

    it("treats an empty latest response as an un-vote", () => {
        const pollStart = PollStartEvent.from("Best fruit?", ["Apple", "Banana"], M_POLL_KIND_DISCLOSED);
        const [appleAnswer] = pollStart.answers;
        const vote = createMatrixPollResponse(
            PollResponseEvent.from([appleAnswer.id], "$poll").serialize(),
            "@alice:server",
            2
        );
        const unvote = createMatrixPollResponse(PollResponseEvent.from([], "$poll").serialize(), "@alice:server", 3);

        const state = computePollState(pollStart, [vote, unvote], {
            currentUserId: "@alice:server",
            isEnded: false,
        });

        expect(state.hasVoted).toBe(false);
        expect(state.totalVotes).toBe(0);
        expect(state.spoiledVotes).toBe(0);
    });

    it("marks the latest invalid response as spoiled and removes previous valid votes", () => {
        const pollStart = PollStartEvent.from("Best fruit?", ["Apple", "Banana"], M_POLL_KIND_DISCLOSED);
        const [appleAnswer] = pollStart.answers;
        const validVote = createMatrixPollResponse(
            PollResponseEvent.from([appleAnswer.id], "$poll").serialize(),
            "@alice:server",
            2
        );
        const invalidVote = createMatrixEvent(
            {
                type: M_POLL_RESPONSE.name,
                content: {
                    "m.relates_to": {
                        rel_type: "m.reference",
                        event_id: "$poll",
                    },
                    [M_POLL_RESPONSE.name]: {
                        answers: [appleAnswer.id, "unknown-answer"],
                    },
                },
            },
            "@alice:server",
            3
        );

        const state = computePollState(pollStart, [validVote, invalidVote], {
            currentUserId: "@alice:server",
            isEnded: false,
        });

        expect(state.hasVoted).toBe(false);
        expect(state.totalVotes).toBe(0);
        expect(state.spoiledVotes).toBe(1);
    });

    it("supports historical unstable poll response event types", () => {
        const pollStart = PollStartEvent.from("Best fruit?", ["Apple", "Banana"], M_POLL_KIND_DISCLOSED);
        const [appleAnswer] = pollStart.answers;
        const unstableResponse = createMatrixEvent(
            {
                type: M_POLL_RESPONSE.altName,
                content: {
                    "m.relates_to": {
                        rel_type: "m.reference",
                        event_id: "$poll",
                    },
                    [M_POLL_RESPONSE.altName]: {
                        answers: [appleAnswer.id],
                    },
                },
            },
            "@alice:server",
            2
        );

        const state = computePollState(pollStart, [unstableResponse], {
            currentUserId: "@alice:server",
            isEnded: false,
        });

        expect(state.hasVoted).toBe(true);
        expect(state.answers.find((answer) => answer.id === appleAnswer.id)?.votes).toBe(1);
    });

    it("ignores redacted responses when computing the latest vote", () => {
        const pollStart = PollStartEvent.from("Best fruit?", ["Apple", "Banana"], M_POLL_KIND_DISCLOSED);
        const [appleAnswer, bananaAnswer] = pollStart.answers;
        const firstResponse = createMatrixPollResponse(
            PollResponseEvent.from([appleAnswer.id], "$poll").serialize(),
            "@alice:server",
            2
        );
        const redactedLaterResponse = createMatrixPollResponse(
            PollResponseEvent.from([bananaAnswer.id], "$poll").serialize(),
            "@alice:server",
            3,
            true
        );

        const state = computePollState(pollStart, [firstResponse, redactedLaterResponse], {
            currentUserId: "@alice:server",
            isEnded: false,
        });

        expect(state.myAnswerIds).toEqual([appleAnswer.id]);
        expect(state.answers.find((answer) => answer.id === appleAnswer.id)?.votes).toBe(1);
        expect(state.answers.find((answer) => answer.id === bananaAnswer.id)?.votes).toBe(0);
    });
});

function createMatrixPollResponse(
    serializedEvent: IPartialEvent<object>,
    sender: string,
    ts: number,
    redacted = false
) {
    return createMatrixEvent(serializedEvent, sender, ts, redacted);
}

function createMatrixEvent(serializedEvent: IPartialEvent<object>, sender: string, ts: number, redacted = false) {
    return new MatrixEvent({
        event_id: `$event-${ts}-${serializedEvent.type}-${sender}`,
        type: serializedEvent.type,
        room_id: "!room:server",
        sender,
        user_id: sender,
        origin_server_ts: ts,
        content: serializedEvent.content as Record<string, unknown>,
        unsigned: redacted
            ? {
                  redacted_because: {
                      event_id: `$redaction-${ts}`,
                      type: "m.room.redaction",
                      room_id: "!room:server",
                      sender,
                      origin_server_ts: ts + 1000,
                      content: {},
                      unsigned: {},
                  },
              }
            : undefined,
    } as never);
}
