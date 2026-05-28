import { get, writable, type Readable, type Writable } from "svelte/store";
import type { AnyKindOfUser, ChatQuestionItem, ChatQuestionState } from "../ChatConnection";
import {
    computeProximityQAState,
    getProximityQAAnswerMetadataKey,
    getProximityQADeleteMetadataKey,
    getProximityQAUpvoteMetadataKey,
    type ProximityQAAnswerMetadata,
    type ProximityQAQuestionMetadata,
    type ProximityQAUpvoteMetadata,
} from "./ProximityQAMetadata";

export class ProximityQuestionPermissionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ProximityQuestionPermissionError";
    }
}

export type ProximityChatQuestionOptions = {
    definition: ProximityQAQuestionMetadata;
    upvotes: ProximityQAUpvoteMetadata[];
    answer: ProximityQAAnswerMetadata | undefined;
    currentVoterId: string;
    sender: AnyKindOfUser | undefined;
    canMarkAnswered: boolean;
    canDeleteAny: boolean;
    updateMetadata: (metadata: Map<string, unknown>) => void;
};

export type ProximityChatQuestionUpdate = {
    upvotes: ProximityQAUpvoteMetadata[];
    answer: ProximityQAAnswerMetadata | undefined;
    currentVoterId: string;
    sender: AnyKindOfUser | undefined;
    canMarkAnswered: boolean;
    canDeleteAny: boolean;
};

export class ProximityChatQuestion implements ChatQuestionItem {
    readonly id: string;
    sender: AnyKindOfUser | undefined;
    readonly date: Date;
    readonly state: Readable<ChatQuestionState>;
    readonly canUpvote: Readable<boolean>;
    readonly canDelete: Readable<boolean>;
    readonly canMarkAnswered: Readable<boolean>;

    private readonly definition: ProximityQAQuestionMetadata;
    private currentVoterId: string;
    private readonly updateMetadata: (metadata: Map<string, unknown>) => void;
    private readonly stateStore: Writable<ChatQuestionState>;
    private readonly canUpvoteStore: Writable<boolean>;
    private readonly canDeleteStore: Writable<boolean>;
    private readonly canMarkAnsweredStore: Writable<boolean>;

    constructor(options: ProximityChatQuestionOptions) {
        this.id = options.definition.id;
        this.sender = options.sender;
        this.date = new Date(options.definition.createdAt);
        this.definition = options.definition;
        this.currentVoterId = options.currentVoterId;
        this.updateMetadata = options.updateMetadata;

        const state = this.computeState(options.upvotes, options.answer, options.canMarkAnswered, options.canDeleteAny);
        this.stateStore = writable(state);
        this.canUpvoteStore = writable(state.canUpvote);
        this.canDeleteStore = writable(state.canDelete);
        this.canMarkAnsweredStore = writable(state.canMarkAnswered);
        this.state = this.stateStore;
        this.canUpvote = this.canUpvoteStore;
        this.canDelete = this.canDeleteStore;
        this.canMarkAnswered = this.canMarkAnsweredStore;
    }

    update(update: ProximityChatQuestionUpdate): void {
        this.sender = update.sender;
        this.currentVoterId = update.currentVoterId;
        const state = this.computeState(update.upvotes, update.answer, update.canMarkAnswered, update.canDeleteAny);
        this.stateStore.set(state);
        this.canUpvoteStore.set(state.canUpvote);
        this.canDeleteStore.set(state.canDelete);
        this.canMarkAnsweredStore.set(state.canMarkAnswered);
    }

    toggleUpvote(): Promise<void> {
        if (!get(this.canUpvote)) {
            return Promise.reject(new ProximityQuestionPermissionError("Cannot upvote this question"));
        }

        this.updateMetadata(
            new Map([
                [
                    getProximityQAUpvoteMetadataKey(this.definition.id, this.currentVoterId),
                    {
                        questionId: this.definition.id,
                        voterId: this.currentVoterId,
                        upvoted: !get(this.state).hasUpvoted,
                        updatedAt: Date.now(),
                    },
                ],
            ])
        );
        return Promise.resolve();
    }

    remove(): Promise<void> {
        if (!get(this.canDelete)) {
            return Promise.reject(
                new ProximityQuestionPermissionError("Only question authors or moderators can delete this question")
            );
        }

        this.updateMetadata(
            new Map([
                [
                    getProximityQADeleteMetadataKey(this.definition.id),
                    {
                        questionId: this.definition.id,
                        senderId: this.currentVoterId,
                        deletedAt: Date.now(),
                    },
                ],
            ])
        );
        return Promise.resolve();
    }

    markAnswered(): Promise<void> {
        if (!get(this.canMarkAnswered)) {
            return Promise.reject(
                new ProximityQuestionPermissionError("Only moderators can mark a question as answered")
            );
        }

        this.updateMetadata(
            new Map([
                [
                    getProximityQAAnswerMetadataKey(this.definition.id),
                    {
                        questionId: this.definition.id,
                        moderatorId: this.currentVoterId,
                        answeredAt: Date.now(),
                    },
                ],
            ])
        );
        return Promise.resolve();
    }

    private computeState(
        upvotes: ProximityQAUpvoteMetadata[],
        answer: ProximityQAAnswerMetadata | undefined,
        canMarkAnswered: boolean,
        canDeleteAny: boolean
    ): ChatQuestionState {
        return computeProximityQAState(
            this.definition,
            upvotes,
            answer,
            this.currentVoterId,
            canMarkAnswered,
            canDeleteAny
        );
    }
}
