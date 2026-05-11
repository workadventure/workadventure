import type { MatrixEvent, Room } from "matrix-js-sdk";
import { Direction } from "matrix-js-sdk";
import { get, derived, writable, type Readable, type Writable } from "svelte/store";
import { M_POLL_END, M_POLL_RESPONSE } from "matrix-js-sdk/lib/@types/polls";
import type { Poll } from "matrix-js-sdk/lib/models/poll";
import { PollEvent } from "matrix-js-sdk/lib/models/poll";
import { PollEndEvent } from "matrix-js-sdk/lib/extensible_events_v1/PollEndEvent";
import { PollResponseEvent } from "matrix-js-sdk/lib/extensible_events_v1/PollResponseEvent";
import type { TimelineEvents } from "matrix-js-sdk/lib/@types/event";
import type { ChatPollContext, ChatPollItem, ChatPollState, ChatUser } from "../ChatConnection";
import LL from "../../../../i18n/i18n-svelte";
import { computePollState, type ComputedPollState } from "./MatrixPollUtils";
import { chatUserFactoryFromRoom } from "./MatrixChatUser";

export class MatrixChatPoll implements ChatPollItem {
    id: string;
    sender: ChatUser | undefined;
    date: Date | null;
    context: ChatPollContext;
    state: Readable<ChatPollState>;
    canVote: Readable<boolean>;
    canEnd: Readable<boolean>;
    canDelete: Readable<boolean>;
    private readonly internalState: Writable<ComputedPollState>;
    private readonly handlePollResponses = () => {
        this.refresh().catch((error) => console.error("Failed to refresh poll responses", error));
    };
    private readonly handlePollEnd = () => {
        this.refresh().catch((error) => console.error("Failed to refresh ended poll", error));
    };
    private readonly handlePollUndecryptableRelations = () => {
        this.refresh().catch((error) => console.error("Failed to refresh undecryptable poll relations", error));
    };

    constructor(private readonly poll: Poll, private readonly room: Room, context?: ChatPollContext) {
        this.id = poll.pollId;
        this.sender = this.getSender();
        this.date = poll.rootEvent.getDate();
        this.context = context ?? { kind: "room" };
        this.internalState = writable(
            computePollState(this.poll.pollEvent, [], {
                currentUserId: this.room.client.getSafeUserId(),
                isEnded: this.poll.isEnded,
            })
        );
        this.state = this.internalState;
        this.canVote = derived(this.internalState, ($state) => !$state.isEnded);
        this.canEnd = derived(this.internalState, ($state) => {
            if ($state.isEnded) {
                return false;
            }

            const currentUserId = this.room.client.getSafeUserId();
            if (!currentUserId) {
                return false;
            }

            return currentUserId === this.poll.rootEvent.getSender();
        });
        this.canDelete = writable(this.computeCanDelete());

        this.poll.on(PollEvent.Responses, this.handlePollResponses);
        this.poll.on(PollEvent.End, this.handlePollEnd);
        this.poll.on(PollEvent.UndecryptableRelations, this.handlePollUndecryptableRelations);

        this.refresh().catch((error) => console.error("Failed to initialize poll", error));
    }

    async vote(answerIds: string[]): Promise<void> {
        const event = PollResponseEvent.from(answerIds, this.id).serialize();
        await this.room.client.sendEvent(
            this.room.roomId,
            this.context.kind === "thread" ? this.context.threadRootMessageId : null,
            event.type as keyof TimelineEvents,
            event.content as TimelineEvents[keyof TimelineEvents]
        );
    }

    async end(): Promise<void> {
        if (this.room.client.getSafeUserId() !== this.poll.rootEvent.getSender()) {
            throw new Error("Only the poll creator can close this poll");
        }

        const state = get(this.internalState);
        const endMessage = state.winningAnswerText
            ? get(LL).chat.poll.end.withWinner({ answer: state.winningAnswerText })
            : get(LL).chat.poll.end.generic();
        const event = PollEndEvent.from(this.id, endMessage).serialize();
        await this.room.client.sendEvent(
            this.room.roomId,
            this.context.kind === "thread" ? this.context.threadRootMessageId : null,
            event.type as keyof TimelineEvents,
            event.content as TimelineEvents[keyof TimelineEvents]
        );
    }

    async remove(): Promise<void> {
        if (!get(this.canDelete)) {
            throw new Error("You do not have permission to delete this poll");
        }

        await this.room.client.redactEvent(this.room.roomId, this.id);
    }

    async refresh(): Promise<void> {
        if (this.poll.rootEvent.isRedacted()) {
            return;
        }

        const relationEvents = await this.getResponseRelationEvents();
        const endEvent = this.getEndEvent();
        const isEnded = this.poll.isEnded || !!endEvent;
        const nextState = computePollState(this.poll.pollEvent, relationEvents, {
            currentUserId: this.room.client.getSafeUserId(),
            isEnded,
            endEvent,
            undecryptableRelationsCount: this.poll.undecryptableRelationsCount,
        });
        this.internalState.set(nextState);
    }

    destroy(): void {
        this.poll.off(PollEvent.Responses, this.handlePollResponses);
        this.poll.off(PollEvent.End, this.handlePollEnd);
        this.poll.off(PollEvent.UndecryptableRelations, this.handlePollUndecryptableRelations);
    }

    private getSender(): ChatUser | undefined {
        const senderUserId = this.poll.rootEvent.getSender();
        return senderUserId ? chatUserFactoryFromRoom(this.room, senderUserId) : undefined;
    }

    private getEndEvent(): MatrixEvent | undefined {
        const endEventId = this.poll.endEventId;
        if (!endEventId) {
            return this.getTimelinePollEndEvents()[0];
        }

        return (
            this.room.findEventById(endEventId) ??
            this.getTimelinePollEndEvents().find((event) => event.getId() === endEventId) ??
            undefined
        );
    }

    private computeCanDelete(): boolean {
        const currentUserId = this.room.client.getSafeUserId();
        const senderUserId = this.poll.rootEvent.getSender();

        if (!currentUserId || !senderUserId) {
            return false;
        }

        if (currentUserId === senderUserId) {
            return true;
        }

        const myRoomMember = this.room.getMember(currentUserId);
        const senderRoomMember = this.room.getMember(senderUserId);
        const myPowerLevel = myRoomMember?.powerLevelNorm ?? 0;
        const senderPowerLevel = senderRoomMember?.powerLevelNorm ?? 0;
        const hasSufficientPowerLevel =
            this.room
                .getLiveTimeline()
                .getState(Direction.Backward)
                ?.hasSufficientPowerLevelFor("redact", myPowerLevel) ?? false;

        return hasSufficientPowerLevel && myPowerLevel > senderPowerLevel;
    }

    private async getResponseRelationEvents(): Promise<MatrixEvent[]> {
        let responses = await this.poll.getResponses();

        if (!responses && this.poll.isFetchingResponses) {
            await this.waitForResponses();
            responses = await this.poll.getResponses();
        }

        return this.mergeRelationEvents(responses?.getRelations() ?? [], this.getTimelinePollResponseEvents());
    }

    private waitForResponses(): Promise<void> {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                this.poll.off(PollEvent.Responses, handleResponses);
                resolve();
            }, 1000);

            const handleResponses = () => {
                clearTimeout(timeout);
                this.poll.off(PollEvent.Responses, handleResponses);
                resolve();
            };

            this.poll.on(PollEvent.Responses, handleResponses);
        });
    }

    private getTimelinePollResponseEvents(): MatrixEvent[] {
        return this.room
            .getLiveTimeline()
            .getEvents()
            .filter((event) => {
                const relation = event.getRelation();
                return (
                    relation?.rel_type === "m.reference" &&
                    relation.event_id === this.id &&
                    M_POLL_RESPONSE.matches(event.getType())
                );
            });
    }

    private getTimelinePollEndEvents(): MatrixEvent[] {
        return this.room
            .getLiveTimeline()
            .getEvents()
            .filter((event) => {
                const relation = event.getRelation();
                return (
                    relation?.rel_type === "m.reference" &&
                    relation.event_id === this.id &&
                    M_POLL_END.matches(event.getType())
                );
            });
    }

    private mergeRelationEvents(...eventGroups: MatrixEvent[][]): MatrixEvent[] {
        const eventsById = new Map<string, MatrixEvent>();

        for (const events of eventGroups) {
            for (const event of events) {
                const eventKey =
                    event.getId() ?? event.getTxnId() ?? `${event.getType()}-${event.getSender()}-${event.getTs()}`;
                if (!eventsById.has(eventKey)) {
                    eventsById.set(eventKey, event);
                }
            }
        }

        return Array.from(eventsById.values());
    }
}
