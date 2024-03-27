import { derived, get, writable } from "svelte/store";
import { v4 as uuid } from "uuid";
import { ChatMessageTypes } from "@workadventure/shared-utils";
import { User } from "../Xmpp/AbstractRoom";
import { Message } from "../Model/Message";
import { FileExt, UploadedFile, uploadingState } from "../Service/FileMessageManager";
import { _newChatMessageSubject } from "../../Stores/ChatStore";
import { mucRoomsStore, xmppServerConnectionStatusStore } from "./MucRoomsStore";
import { userStore } from "./LocalUserStore";
import { activeThreadStore } from "./ActiveThreadStore";

export interface ChatMessage {
    id: string;
    type: ChatMessageTypes;
    date: Date;
    author?: User;
    targets?: User[];
    text?: string[];
    authorName?: string;
}

function createChatMessagesStore() {
    const { subscribe, update } = writable<ChatMessage[]>([]);

    return {
        subscribe,
        addIncomingUser(user: User) {
            update((list) => {
                list.push({
                    id: uuid(),
                    type: ChatMessageTypes.userIncoming,
                    targets: [user],
                    date: new Date(),
                });
                return list;
            });
        },
        addOutcomingUser(user: User) {
            update((list) => {
                list.push({
                    id: uuid(),
                    type: ChatMessageTypes.userOutcoming,
                    targets: [user],
                    date: new Date(),
                });
                return list;
            });
        },
        addPersonalMessage(text: string) {
            _newChatMessageSubject.next(text);
            update((list) => {
                const defaultRoom = mucRoomsStore.getDefaultRoom();
                list.push({
                    id: uuid(),
                    type: ChatMessageTypes.me,
                    text: [text],
                    author: defaultRoom ? defaultRoom.getUserByJid(defaultRoom.myJID) : undefined,
                    date: new Date(),
                    authorName: userStore.get().name,
                });
                return list;
            });
        },
        /**
         * @param origin The iframe that originated this message (if triggered from the Scripting API), or undefined otherwise.
         */
        addExternalMessage(user: User | undefined, text: string, authorName?: string, origin?: Window) {
            update((list) => {
                list.push({
                    id: uuid(),
                    type: ChatMessageTypes.text,
                    text: [text],
                    author: user,
                    date: new Date(),
                    authorName,
                });
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




export const timelineActiveStore = writable<boolean>(false);

export const lastTimelineMessageRead = writable<Date>(new Date());

export const writingStatusMessageStore = writable<
    Array<{
        jid?: string;
        name?: string;
    }>
>([]);

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

 export const totalMessagesToSee = derived(
    [...[...get(mucRoomsStore)].map((mucRoom) => mucRoom.getCountMessagesToSee()), timelineMessagesToSee],
    ($totalMessagesToSee) => $totalMessagesToSee.reduce((sum , number ) => sum + number, 0)
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


export const connectionNotAuthorizedStore = writable<boolean>(false);
export const connectionEstablishedStore = writable<boolean>(false);

export const navChat = writable<string>("chat");

export const shownRoomListStore = writable<string>("");
export const showChatZonesStore = writable<boolean>(false);
export const showForumsStore = writable<boolean>(false);
export const showTimelineStore = writable<boolean>(false);


export const loading = derived(
    [connectionEstablishedStore, xmppServerConnectionStatusStore],
    ([$connectionEstablishedStore, $xmppServerConnectionStatusStore]) =>
        !$connectionEstablishedStore || !$xmppServerConnectionStatusStore
);

export const showPart = derived(
    [connectionNotAuthorizedStore, timelineActiveStore, activeThreadStore, loading],
    ([$connectionNotAuthorizedStore, $timelineActiveStore, $activeThreadStore, $loading]) => {
        if ($timelineActiveStore) {
            return "activeTimeline";
        } else if ($connectionNotAuthorizedStore) {
            return "connectionNotAuthorized";
        } else if ($loading) {
            return "loading";
        } else if ($activeThreadStore) {
            return "activeThread";
        }
        return "home";
    }
);
