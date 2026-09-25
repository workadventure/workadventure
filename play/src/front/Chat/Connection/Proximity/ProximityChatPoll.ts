import { writable, type Readable, type Writable } from "svelte/store";
import type { ProximityPoll } from "@workadventure/shared-utils";
import type { SpaceInterface } from "../../../Space/SpaceInterface";
import type { AnyKindOfUser, ChatPollContext, ChatPollItem, ChatPollState } from "../ChatConnection";
import { computeProximityPollState } from "./ProximityPollState";

export class ProximityPollPermissionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ProximityPollPermissionError";
    }
}

export class ProximityPollClosedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ProximityPollClosedError";
    }
}

export type ProximityChatPollOptions = {
    poll: ProximityPoll;
    currentVoterId: string;
    sender: AnyKindOfUser | undefined;
    space: Pick<SpaceInterface, "votePoll" | "closePoll" | "deletePoll">;
};

export type ProximityChatPollUpdate = {
    poll: ProximityPoll;
    currentVoterId: string;
    sender: AnyKindOfUser | undefined;
};

export class ProximityChatPoll implements ChatPollItem {
    readonly id: string;
    sender: AnyKindOfUser | undefined;
    readonly date: Date;
    readonly context: ChatPollContext = { kind: "room" };
    readonly state: Readable<ChatPollState>;
    readonly canVote: Readable<boolean>;
    readonly canEnd: Readable<boolean>;
    readonly canDelete: Readable<boolean>;

    private poll: ProximityPoll;
    private currentVoterId: string;
    private readonly space: ProximityChatPollOptions["space"];
    private readonly stateStore: Writable<ChatPollState>;
    private readonly canVoteStore: Writable<boolean>;
    private readonly canEndStore: Writable<boolean>;
    private readonly canDeleteStore: Writable<boolean>;

    constructor(options: ProximityChatPollOptions) {
        this.id = options.poll.id;
        this.sender = options.sender;
        this.date = new Date(options.poll.createdAt);
        this.poll = options.poll;
        this.currentVoterId = options.currentVoterId;
        this.space = options.space;

        this.stateStore = writable(this.computeState());
        this.canVoteStore = writable(this.computeCanVote());
        this.canEndStore = writable(this.computeCanEnd());
        this.canDeleteStore = writable(this.computeCanDelete());
        this.state = this.stateStore;
        this.canVote = this.canVoteStore;
        this.canEnd = this.canEndStore;
        this.canDelete = this.canDeleteStore;
    }

    update(update: ProximityChatPollUpdate): void {
        this.sender = update.sender;
        // The space state keeps an unchanged poll's object: nothing to recompute, nothing to re-render.
        if (update.poll === this.poll && update.currentVoterId === this.currentVoterId) {
            return;
        }
        this.poll = update.poll;
        this.currentVoterId = update.currentVoterId;
        this.stateStore.set(this.computeState());
        this.canVoteStore.set(this.computeCanVote());
        this.canEndStore.set(this.computeCanEnd());
        this.canDeleteStore.set(this.computeCanDelete());
    }

    vote(answerIds: string[]): Promise<void> {
        if (this.poll.end !== undefined) {
            return Promise.reject(new ProximityPollClosedError("Cannot vote on a closed poll"));
        }

        return this.space.votePoll(this.id, answerIds, this.currentVoterId);
    }

    end(): Promise<void> {
        const permissionError = this.getCreatorPermissionError("Only the poll creator can close this poll");
        if (permissionError) {
            return Promise.reject(permissionError);
        }

        if (this.poll.end !== undefined) {
            return Promise.resolve();
        }

        return this.space.closePoll(this.id);
    }

    remove(): Promise<void> {
        const permissionError = this.getCreatorPermissionError("Only the poll creator can delete this poll");
        if (permissionError) {
            return Promise.reject(permissionError);
        }

        return this.space.deletePoll(this.id);
    }

    private getCreatorPermissionError(message: string): ProximityPollPermissionError | undefined {
        if (this.poll.senderId === this.currentVoterId) {
            return undefined;
        }

        return new ProximityPollPermissionError(message);
    }

    private computeState(): ChatPollState {
        return computeProximityPollState(this.poll, this.currentVoterId);
    }

    private computeCanVote(): boolean {
        return this.poll.end === undefined;
    }

    private computeCanEnd(): boolean {
        return this.poll.senderId === this.currentVoterId && this.poll.end === undefined;
    }

    private computeCanDelete(): boolean {
        return this.poll.senderId === this.currentVoterId;
    }
}
