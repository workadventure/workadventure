import { writable, type Readable, type Writable } from "svelte/store";
import type { AnyKindOfUser, ChatPollContext, ChatPollItem, ChatPollState } from "../ChatConnection";
import {
    computeProximityPollState,
    getProximityPollDeleteMetadataKey,
    getProximityPollEndMetadataKey,
    getProximityPollVoteMetadataKey,
    type ProximityPollDefinitionMetadata,
    type ProximityPollEndMetadata,
    type ProximityPollVoteMetadata,
} from "./ProximityPollMetadata";

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
    definition: ProximityPollDefinitionMetadata;
    votes: ProximityPollVoteMetadata[];
    end: ProximityPollEndMetadata | undefined;
    currentVoterId: string;
    sender: AnyKindOfUser | undefined;
    updateMetadata: (metadata: Map<string, unknown>) => void;
};

export type ProximityChatPollUpdate = {
    votes: ProximityPollVoteMetadata[];
    end: ProximityPollEndMetadata | undefined;
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

    private readonly definition: ProximityPollDefinitionMetadata;
    private endMetadata: ProximityPollEndMetadata | undefined;
    private currentVoterId: string;
    private readonly updateMetadata: (metadata: Map<string, unknown>) => void;
    private readonly stateStore: Writable<ChatPollState>;
    private readonly canVoteStore: Writable<boolean>;
    private readonly canEndStore: Writable<boolean>;
    private readonly canDeleteStore: Writable<boolean>;

    constructor(options: ProximityChatPollOptions) {
        this.id = options.definition.id;
        this.sender = options.sender;
        this.date = new Date(options.definition.createdAt);
        this.definition = options.definition;
        this.endMetadata = options.end;
        this.currentVoterId = options.currentVoterId;
        this.updateMetadata = options.updateMetadata;

        this.stateStore = writable(this.computeState(options.votes, options.end));
        this.canVoteStore = writable(this.computeCanVote(options.end));
        this.canEndStore = writable(this.computeCanEnd(options.end));
        this.canDeleteStore = writable(this.computeCanDelete());
        this.state = this.stateStore;
        this.canVote = this.canVoteStore;
        this.canEnd = this.canEndStore;
        this.canDelete = this.canDeleteStore;
    }

    update(update: ProximityChatPollUpdate): void {
        this.sender = update.sender;
        this.endMetadata = update.end;
        this.currentVoterId = update.currentVoterId;
        this.stateStore.set(this.computeState(update.votes, update.end));
        this.canVoteStore.set(this.computeCanVote(update.end));
        this.canEndStore.set(this.computeCanEnd(update.end));
        this.canDeleteStore.set(this.computeCanDelete());
    }

    vote(answerIds: string[]): Promise<void> {
        if (this.endMetadata !== undefined) {
            return Promise.reject(new ProximityPollClosedError("Cannot vote on a closed poll"));
        }

        this.updateMetadata(
            new Map([
                [
                    getProximityPollVoteMetadataKey(this.definition.id, this.currentVoterId),
                    {
                        pollId: this.definition.id,
                        voterId: this.currentVoterId,
                        answerIds,
                        updatedAt: Date.now(),
                    },
                ],
            ]),
        );
        return Promise.resolve();
    }

    end(): Promise<void> {
        const permissionError = this.getCreatorPermissionError("Only the poll creator can close this poll");
        if (permissionError) {
            return Promise.reject(permissionError);
        }

        if (this.endMetadata !== undefined) {
            return Promise.resolve();
        }

        this.updateMetadata(
            new Map([
                [
                    getProximityPollEndMetadataKey(this.definition.id),
                    {
                        pollId: this.definition.id,
                        senderId: this.currentVoterId,
                        closedAt: Date.now(),
                    },
                ],
            ]),
        );
        return Promise.resolve();
    }

    remove(): Promise<void> {
        const permissionError = this.getCreatorPermissionError("Only the poll creator can delete this poll");
        if (permissionError) {
            return Promise.reject(permissionError);
        }

        this.updateMetadata(
            new Map([
                [
                    getProximityPollDeleteMetadataKey(this.definition.id),
                    {
                        pollId: this.definition.id,
                        senderId: this.currentVoterId,
                        deletedAt: Date.now(),
                    },
                ],
            ]),
        );
        return Promise.resolve();
    }

    private getCreatorPermissionError(message: string): ProximityPollPermissionError | undefined {
        if (this.definition.senderId === this.currentVoterId) {
            return undefined;
        }

        return new ProximityPollPermissionError(message);
    }

    private computeState(votes: ProximityPollVoteMetadata[], end: ProximityPollEndMetadata | undefined): ChatPollState {
        return computeProximityPollState(this.definition, votes, end, this.currentVoterId);
    }

    private computeCanVote(end: ProximityPollEndMetadata | undefined): boolean {
        return end === undefined;
    }

    private computeCanEnd(end: ProximityPollEndMetadata | undefined): boolean {
        return this.definition.senderId === this.currentVoterId && end === undefined;
    }

    private computeCanDelete(): boolean {
        return this.definition.senderId === this.currentVoterId;
    }
}
