import type { SpaceState } from "@workadventure/shared-utils";
import { emptySpaceState, spaceStateSchema } from "@workadventure/shared-utils";
import type { Operation } from "fast-json-patch";
import { applyPatch } from "fast-json-patch";
import type { Readable } from "svelte/store";
import { derived, get, readable, writable } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import type { SpaceStateQuery, SpaceUser } from "@workadventure/messages";
import { notificationPlayingStore } from "../Stores/NotificationStore";
import { LL } from "../../i18n/i18n-svelte";
import type { FloorSpeaker, RaisedHand } from "./SpaceInterface";
import type { RoomConnectionForSpacesInterface } from "./SpaceRegistry/SpaceRegistry";
import { shareUnchanged } from "./SpaceStateSharing";

const RECORDING_QUERY_TIMEOUT_MS = 60_000;

type StateChange = (state: SpaceState) => void;

/**
 * The server-owned state of a space: what the back last sent, plus the local changes it has not confirmed yet
 * (optimistic updates). Every change goes through the back, which broadcasts it back as a JSON Patch.
 */
export class SpaceStateManager {
    private readonly serverStore = writable<SpaceState>(emptySpaceState());
    private readonly pendingChangesStore = writable<StateChange[]>([]);
    private initialized = false;
    private destroyed = false;
    /** The server state, with the local user's pending changes already applied. */
    public readonly store: Readable<SpaceState>;
    /** Ordered queue of users who raised their hand in this space. */
    public readonly raisedHandsStore: Readable<RaisedHand[]>;
    /**
     * The OTHER users who currently hold a GRANTED floor (given after a raised hand). Only granted guests appear
     * here — never the hosts/original speakers — so a promoted guest can never take the floor back from the
     * presenter.
     */
    public readonly speakingUsersStore: Readable<FloorSpeaker[]>;

    constructor(
        private readonly spaceName: string,
        private readonly connection: RoomConnectionForSpacesInterface,
        private readonly mySpaceUserId: SpaceUser["spaceUserId"],
    ) {
        // Unlike the users, the state reaches every member of the space, watching it or not: no filter to register.
        this.store = derived([this.serverStore, this.pendingChangesStore], ([$serverState, $pendingChanges]) => {
            if ($pendingChanges.length === 0) {
                return $serverState;
            }
            const state = structuredClone($serverState);
            for (const change of $pendingChanges) {
                change(state);
            }
            return shareUnchanged($serverState, state);
        });

        // The raised-hands queue lives in the space state (broadcast to all members, unlike SpaceUser),
        // so it reaches every participant including a megaphone speaker without seeAttendees.
        this.raisedHandsStore = this.observe("raisedHands");
        this.speakingUsersStore = derived(this.observe("floorHolders"), ($floorHolders) =>
            $floorHolders.filter((entry) => entry.spaceUserId !== this.mySpaceUserId),
        );
    }

    /** False until the whole state has arrived (right after joining): until then, the store is empty. */
    public isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Notifies only when this slice changed. The state store notifies on any patch, and Svelte counts any object as
     * changed, so a plain derived() would wake every slice's readers; slices are shared by reference when unchanged
     * (see shareUnchanged), which makes the check a cheap `!==`.
     */
    public observe<K extends keyof SpaceState>(key: K): Readable<SpaceState[K]> {
        // What the returned store holds: it keeps its value between subscriptions, so compare with that.
        let current = get(this.store)[key];
        return readable(current, (set) => {
            return this.store.subscribe(($state) => {
                if ($state[key] !== current) {
                    current = $state[key];
                    set(current);
                }
            });
        });
    }

    /**
     * Applies a JSON Patch sent by the back. Right after joining, the pusher sends the whole state as a patch that
     * replaces the root: anything received before it is already included in it.
     */
    public applyPatch(patchJson: string): void {
        try {
            const patch = JSON.parse(patchJson) as Operation[];
            const replacesRoot = patch[0]?.op === "replace" && patch[0].path === "";
            if (!this.initialized && !replacesRoot) {
                return;
            }
            const previous = get(this.serverStore);
            const state = shareUnchanged(
                previous,
                spaceStateSchema.parse(applyPatch(structuredClone(previous), patch).newDocument),
            );
            // Before the set: subscribers run during it and may ask whether the state is complete.
            this.initialized = true;
            this.serverStore.set(state);
        } catch (error) {
            // Our copy no longer matches the back's: it stays as it was until the next full state (next join).
            console.error(`Could not apply a state patch in space ${this.spaceName}`, error);
            Sentry.captureException(error);
        }
    }

    public destroy(): void {
        this.destroyed = true;
    }

    // Unlike the other state changes, a refused recording is reported by the caller (the recording menu).
    public async startRecording(): Promise<void> {
        await this.alter({ $case: "startRecording", startRecording: {} }, { timeout: RECORDING_QUERY_TIMEOUT_MS });
    }

    public async stopRecording(): Promise<void> {
        await this.alter({ $case: "stopRecording", stopRecording: {} }, { timeout: RECORDING_QUERY_TIMEOUT_MS });
    }

    // The methods below report a refused change to the user; they never reject.

    public raiseHand(raised: boolean): Promise<void> {
        const mySpaceUserId = this.mySpaceUserId;
        return this.change({ $case: "raiseHand", raiseHand: { raised } }, (state) => {
            const index = state.raisedHands.findIndex((entry) => entry.spaceUserId === mySpaceUserId);
            if (!raised && index !== -1) {
                state.raisedHands.splice(index, 1);
            } else if (raised && index === -1) {
                // The back stamps the real name and time; the local user never shows its own name in the queue.
                state.raisedHands.push({ spaceUserId: mySpaceUserId, name: "", at: Date.now() });
            }
        });
    }

    public lowerHand(targetSpaceUserId: SpaceUser["spaceUserId"]): Promise<void> {
        return this.change({ $case: "lowerHand", lowerHand: { targetSpaceUserId } });
    }

    public giveFloor(targetSpaceUserId: SpaceUser["spaceUserId"]): Promise<void> {
        return this.change({ $case: "giveFloor", giveFloor: { targetSpaceUserId } });
    }

    public revokeFloor(targetSpaceUserId: SpaceUser["spaceUserId"]): Promise<void> {
        return this.change({ $case: "revokeFloor", revokeFloor: { targetSpaceUserId } });
    }

    public createPoll(poll: {
        question: string;
        kind: "open" | "closed";
        answers: string[];
        maxSelections: number;
    }): Promise<void> {
        return this.change({ $case: "createPoll", createPoll: poll });
    }

    public votePoll(pollId: string, answerIds: string[], voterId: string): Promise<void> {
        return this.change({ $case: "votePoll", votePoll: { pollId, answerIds } }, (state) => {
            const poll = state.polls[pollId];
            if (!poll) {
                return;
            }
            if (answerIds.length === 0) {
                delete poll.votes[voterId];
            } else {
                poll.votes[voterId] = { answerIds, updatedAt: Date.now() };
            }
        });
    }

    public closePoll(pollId: string, closingMessage?: string): Promise<void> {
        return this.change({ $case: "closePoll", closePoll: { pollId, closingMessage } });
    }

    public deletePoll(pollId: string): Promise<void> {
        return this.change({ $case: "deletePoll", deletePoll: { pollId } });
    }

    public askQuestion(body: string): Promise<void> {
        return this.change({ $case: "askQuestion", askQuestion: { body } });
    }

    public upvoteQuestion(questionId: string, upvoted: boolean, voterId: string): Promise<void> {
        return this.change({ $case: "upvoteQuestion", upvoteQuestion: { questionId, upvoted } }, (state) => {
            const question = state.questions[questionId];
            if (!question) {
                return;
            }
            if (upvoted) {
                question.upvotes[voterId] ??= Date.now();
            } else {
                delete question.upvotes[voterId];
            }
        });
    }

    public answerQuestion(questionId: string): Promise<void> {
        return this.change({ $case: "answerQuestion", answerQuestion: { questionId } });
    }

    public deleteQuestion(questionId: string): Promise<void> {
        return this.change({ $case: "deleteQuestion", deleteQuestion: { questionId } });
    }

    /**
     * Sends a state change and reports a refusal to the user. `optimisticChange` is shown right away, and dropped
     * once the back answered: by then its patch (if accepted) is already in the server state.
     */
    private change(query: NonNullable<SpaceStateQuery["query"]>, optimisticChange?: StateChange): Promise<void> {
        return this.alter(query, { optimisticChange }).catch((error) => {
            console.error(`Space state change "${query.$case}" failed in space ${this.spaceName}`, error);
            notificationPlayingStore.playNotification(get(LL).notification.actionFailed());
        });
    }

    private async alter(
        query: NonNullable<SpaceStateQuery["query"]>,
        options: { optimisticChange?: StateChange; timeout?: number },
    ): Promise<void> {
        if (this.destroyed) {
            throw new Error(`Space ${this.spaceName} is destroyed`);
        }
        const { optimisticChange, timeout } = options;
        if (optimisticChange) {
            this.pendingChangesStore.update((changes) => [...changes, optimisticChange]);
        }
        try {
            await this.connection.alterSpaceState(this.spaceName, query, { timeout });
        } finally {
            if (optimisticChange) {
                this.pendingChangesStore.update((changes) => changes.filter((change) => change !== optimisticChange));
            }
        }
    }
}
