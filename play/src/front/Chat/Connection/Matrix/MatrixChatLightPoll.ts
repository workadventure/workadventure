import type { Room } from "matrix-js-sdk";
import type { Poll } from "matrix-js-sdk/lib/models/poll";
import { PollEvent } from "matrix-js-sdk/lib/models/poll";
import { readable, type Readable, writable } from "svelte/store";
import type {
    ChatPollContext,
    ChatPollItem,
    ChatPollState,
    ChatRoomSidePanelHydrationState,
    ChatUser,
} from "../ChatConnection";
import { computePollState } from "./MatrixPollUtils";
import { chatUserFactoryFromRoom } from "./MatrixChatUser";

export class MatrixChatLightPoll implements ChatPollItem {
    readonly id: string;
    readonly sender: ChatUser | undefined;
    readonly date: Date | null;
    readonly context: ChatPollContext;
    readonly state: Readable<ChatPollState>;
    readonly canVote = readable(false);
    readonly canEnd = readable(false);
    readonly canDelete = readable(false);
    readonly hydrationState: Readable<ChatRoomSidePanelHydrationState>;

    private readonly stateStore;
    private readonly hydrationStateStore;
    private readonly handlePollEnd = () => {
        this.refreshState();
    };

    constructor(
        private readonly poll: Poll,
        private readonly room: Room,
        context?: ChatPollContext,
        options?: {
            hydrationState?: ChatRoomSidePanelHydrationState;
            retryHydration?: () => Promise<void>;
        },
    ) {
        this.id = poll.pollId;
        this.sender = this.getSender();
        this.date = poll.rootEvent.getDate();
        this.context = context ?? { kind: "room" };
        this.stateStore = writable(this.computeState());
        this.state = this.stateStore;
        this.hydrationStateStore = writable<ChatRoomSidePanelHydrationState>(
            options?.hydrationState ?? {
                status: "ready",
            },
        );
        this.hydrationState = this.hydrationStateStore;
        this.retryHydration = options?.retryHydration;

        this.poll.on(PollEvent.End, this.handlePollEnd);
    }

    readonly retryHydration?: () => Promise<void>;

    vote(_answerIds: string[]): Promise<void> {
        return Promise.reject(new Error("Inline vote is unavailable for lightweight polls"));
    }

    end(): Promise<void> {
        return Promise.reject(new Error("Inline poll management is unavailable for lightweight polls"));
    }

    remove(): Promise<void> {
        return Promise.reject(new Error("Inline poll management is unavailable for lightweight polls"));
    }

    setHydrationState(nextState: ChatRoomSidePanelHydrationState): void {
        this.hydrationStateStore.set(nextState);
    }

    refresh(): void {
        this.refreshState();
    }

    destroy(): void {
        this.poll.off(PollEvent.End, this.handlePollEnd);
    }

    private refreshState(): void {
        this.stateStore.set(this.computeState());
    }

    private computeState(): ChatPollState {
        return computePollState(this.poll.pollEvent, [], {
            currentUserId: this.room.client.getSafeUserId(),
            isEnded: this.poll.isEnded,
        });
    }

    private getSender(): ChatUser | undefined {
        const senderUserId = this.poll.rootEvent.getSender();
        return senderUserId ? chatUserFactoryFromRoom(this.room, senderUserId) : undefined;
    }
}
