import { derived, writable } from "svelte/store";
import { Subject } from "rxjs";
import { userStore } from "./LocalUserStore";
import { UserData } from "../Messages/JsonMessages/ChatData";
import { FileExt, UploadedFile, uploadingState } from "../Services/FileMessageManager";
import { Message, User } from "../Xmpp/MucRoom";

const _newChatMessageSubject = new Subject<string>();
export const newChatMessageSubject = _newChatMessageSubject.asObservable();

export const _newChatMessageWritingStatusSubject = new Subject<number>();
export const newChatMessageWritingStatusSubject = _newChatMessageWritingStatusSubject.asObservable();

export enum ChatMessageTypes {
    text = 1,
    me,
    userIncoming,
    userOutcoming,
    userWriting,
    userStopWriting,
}

export interface ChatMessage {
    type: ChatMessageTypes;
    date: Date;
    author?: UserData;
    targets?: UserData[];
    text?: string[];
}

function createChatMessagesStore() {
    const { subscribe, update } = writable<ChatMessage[]>([]);

    return {
        subscribe,
        addIncomingUser(user: UserData) {
            update((list) => {
                const lastMessage = list[list.length - 1];
                if (lastMessage && lastMessage.type === ChatMessageTypes.userIncoming && lastMessage.targets) {
                    lastMessage.targets.push(user);
                } else {
                    list.push({
                        type: ChatMessageTypes.userIncoming,
                        targets: [user],
                        date: new Date(),
                    });
                }
                return list;
            });
        },
        addOutcomingUser(user: UserData) {
            update((list) => {
                const lastMessage = list[list.length - 1];
                if (lastMessage && lastMessage.type === ChatMessageTypes.userOutcoming && lastMessage.targets) {
                    lastMessage.targets.push(user);
                } else {
                    list.push({
                        type: ChatMessageTypes.userOutcoming,
                        targets: [user],
                        date: new Date(),
                    });
                }
                return list;
            });
        },
        addPersonnalMessage(text: string) {
            _newChatMessageSubject.next(text);
            update((list) => {
                const lastMessage = list[list.length - 1];
                if (
                    lastMessage &&
                    lastMessage.type === ChatMessageTypes.me &&
                    lastMessage.text &&
                    (((new Date().getTime() - lastMessage.date.getTime()) % 86400000) % 3600000) / 60000 < 2
                ) {
                    lastMessage.text.push(text);
                } else {
                    list.push({
                        type: ChatMessageTypes.me,
                        text: [text],
                        author: userStore.get(),
                        date: new Date(),
                    });
                }

                return list;
            });
        },
        /**
         * @param origin The iframe that originated this message (if triggered from the Scripting API), or undefined otherwise.
         */
        addExternalMessage(user: UserData, text: string, origin?: Window) {
            update((list) => {
                const lastMessage = list[list.length - 1];
                if (
                    lastMessage &&
                    lastMessage.type === ChatMessageTypes.text &&
                    lastMessage.text &&
                    lastMessage?.author?.uuid === user.uuid &&
                    (((new Date().getTime() - lastMessage.date.getTime()) % 86400000) % 3600000) / 60000 < 2
                ) {
                    lastMessage.text.push(text);
                } else {
                    list.push({
                        type: ChatMessageTypes.text,
                        text: [text],
                        author: user,
                        date: new Date(),
                    });
                }
                return list;
            });
        },

        reInitialize() {
            update(() => {
                return [];
            });
        },
    };
}
export const chatMessagesStore = createChatMessagesStore();

function createChatSubMenuVisibilityStore() {
    const { subscribe, update } = writable<string>("");

    return {
        subscribe,
        openSubMenu(playerName: string, index: number) {
            const id = playerName + index;
            update((oldValue) => {
                return oldValue === id ? "" : id;
            });
        },
    };
}
export const chatSubMenuVisibilityStore = createChatSubMenuVisibilityStore();

export const chatVisibilityStore = writable<boolean>(false);

export const availabilityStatusStore = writable<number>(1);

export const timelineOpenedStore = writable<boolean>(true);

export const timelineActiveStore = writable<boolean>(false);

export const lastTimelineMessageRead = writable<Date>(new Date());

export const writingStatusMessageStore = writable<Set<string>>(new Set<string>());

export const chatInputFocusStore = writable(false);

export const chatPeerConnectionInProgress = writable<boolean>(false);

export const mentionsUserStore = writable<Set<User>>(new Set<User>());
export const selectedMessageToReply = writable<Message | null>(null);
export const selectedMessageToReact = writable<Message | null>(null);
export const timelineMessagesToSee = derived(
    [chatMessagesStore, lastTimelineMessageRead],
    ([$chatMessagesStore, $lastTimelineMessageRead]) =>
        $chatMessagesStore.filter((message) => message.date > $lastTimelineMessageRead).length
);

export const filesUploadStore = writable<Map<string, UploadedFile | FileExt>>(
    new Map<string, UploadedFile | FileExt>()
);
export const hasErrorUploadingFile = derived([filesUploadStore], ([$filesUploadStore]) =>
    [...$filesUploadStore.values()].reduce(
        (value, file) => (file.uploadState === uploadingState.error ? true : value),
        false
    )
);
export const hasInProgressUploadingFile = derived([filesUploadStore], ([$filesUploadStore]) =>
    [...$filesUploadStore.values()].reduce(
        (value, file) => (file.uploadState === uploadingState.inprogress ? true : value),
        false
    )
);

export const chatSoundsStore = writable<boolean>(true);
export const chatNotificationsStore = writable<boolean>(true);

export const connectionNotAuthorized = writable<boolean>(false);
