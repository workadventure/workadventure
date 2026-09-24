import { get, writable, type Readable, type Writable } from "svelte/store";
import type { ProximityQuestion } from "@workadventure/shared-utils";
import type { SpaceInterface } from "../../../Space/SpaceInterface";
import type { AnyKindOfUser, ChatQuestionItem, ChatQuestionState } from "../ChatConnection";
import { computeProximityQAState } from "./ProximityQAState";

export class ProximityQuestionPermissionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ProximityQuestionPermissionError";
    }
}

export type ProximityChatQuestionOptions = {
    question: ProximityQuestion;
    currentVoterId: string;
    sender: AnyKindOfUser | undefined;
    canMarkAnswered: boolean;
    canDeleteAny: boolean;
    space: Pick<SpaceInterface, "upvoteQuestion" | "answerQuestion" | "deleteQuestion">;
};

export type ProximityChatQuestionUpdate = {
    question: ProximityQuestion;
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

    private currentVoterId: string;
    private readonly space: ProximityChatQuestionOptions["space"];
    private readonly stateStore: Writable<ChatQuestionState>;
    private readonly canUpvoteStore: Writable<boolean>;
    private readonly canDeleteStore: Writable<boolean>;
    private readonly canMarkAnsweredStore: Writable<boolean>;

    constructor(options: ProximityChatQuestionOptions) {
        this.id = options.question.id;
        this.sender = options.sender;
        this.date = new Date(options.question.createdAt);
        this.currentVoterId = options.currentVoterId;
        this.space = options.space;

        const state = computeProximityQAState(
            options.question,
            options.currentVoterId,
            options.canMarkAnswered,
            options.canDeleteAny,
        );
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
        const state = computeProximityQAState(
            update.question,
            update.currentVoterId,
            update.canMarkAnswered,
            update.canDeleteAny,
        );
        this.stateStore.set(state);
        this.canUpvoteStore.set(state.canUpvote);
        this.canDeleteStore.set(state.canDelete);
        this.canMarkAnsweredStore.set(state.canMarkAnswered);
    }

    toggleUpvote(): Promise<void> {
        if (!get(this.canUpvote)) {
            return Promise.reject(new ProximityQuestionPermissionError("Cannot upvote this question"));
        }

        return this.space.upvoteQuestion(this.id, !get(this.state).hasUpvoted, this.currentVoterId);
    }

    remove(): Promise<void> {
        if (!get(this.canDelete)) {
            return Promise.reject(
                new ProximityQuestionPermissionError("Only question authors or moderators can delete this question"),
            );
        }

        return this.space.deleteQuestion(this.id);
    }

    markAnswered(): Promise<void> {
        if (!get(this.canMarkAnswered)) {
            return Promise.reject(
                new ProximityQuestionPermissionError("Only moderators can mark a question as answered"),
            );
        }

        return this.space.answerQuestion(this.id);
    }
}
