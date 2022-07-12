import { writable } from "svelte/store";
import type { PlayerInterface } from "../Type/PlayerInterface";
import { Subject } from "rxjs";
import { localUserStore } from "./LocalUserStore";
import { UserData } from "../Messages/JsonMessages/ChatData";
import { AvailabilityStatus } from "../Messages/ts-proto-generated/protos/messages";
import { getColorByString } from "../Utils/ColorGenerator";

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
    author?: PlayerInterface;
    targets?: PlayerInterface[];
    text?: string[];
}

const PLAYERSTORE_ME_USERID = -2;
export const playersStore = new Map<number, PlayerInterface>();

 function getAuthor(authorId: number): PlayerInterface {
    const author = playersStore.get(authorId);
    if (!author) {
        throw new Error("Could not find data for author " + authorId);
    }
    return author;
}

function getMeOrCreate(){
    let me = playersStore.get(PLAYERSTORE_ME_USERID);
    if(!me){
        const userData = localUserStore.getUserData() as UserData;
        me = {
            userId: PLAYERSTORE_ME_USERID,
            userUuid: userData.uuid,
            name: userData.name,
            characterLayers: [],
            availabilityStatus: AvailabilityStatus.ONLINE,
            color: getColorByString(userData.name),
            visitCardUrl: null,
            companion: null
        } as PlayerInterface
        playersStore.set(PLAYERSTORE_ME_USERID, me);
    }
    return me;
}

function createChatMessagesStore() {
    const { subscribe, update } = writable<ChatMessage[]>([]);

    return {
        subscribe,
        addIncomingUser(authorId: number) {
            update((list) => {
                const lastMessage = list[list.length - 1];
                if (lastMessage && lastMessage.type === ChatMessageTypes.userIncoming && lastMessage.targets) {
                    lastMessage.targets.push(getAuthor(authorId));
                } else {
                    list.push({
                        type: ChatMessageTypes.userIncoming,
                        targets: [getAuthor(authorId)],
                        date: new Date()
                    });
                }
                return list;
            });
        },
        addOutcomingUser(authorId: number) {
            update((list) => {
                const lastMessage = list[list.length - 1];
                if (lastMessage && lastMessage.type === ChatMessageTypes.userOutcoming && lastMessage.targets) {
                    lastMessage.targets.push(getAuthor(authorId));
                } else {
                    list.push({
                        type: ChatMessageTypes.userOutcoming,
                        targets: [getAuthor(authorId)],
                        date: new Date()
                    });
                }
                return list;
            });
        },
        addPersonnalMessage(text: string) {
            _newChatMessageSubject.next(text);
            update((list) => {
                const lastMessage = list[list.length - 1];
                if (lastMessage && lastMessage.type === ChatMessageTypes.me && lastMessage.text) {
                    lastMessage.text.push(text);
                } else {
                    list.push({
                        type: ChatMessageTypes.me,
                        text: [text],
                        author: getMeOrCreate(),
                        date: new Date()
                    });
                }

                return list;
            });
        },
        /**
         * @param origin The iframe that originated this message (if triggered from the Scripting API), or undefined otherwise.
         */
        addExternalMessage(authorId: number, text: string, origin?: Window) {
            update((list) => {
                const lastMessage = list[list.length - 1];
                if (
                    lastMessage &&
                    lastMessage.type === ChatMessageTypes.text &&
                    lastMessage.text &&
                    lastMessage?.author?.userId === authorId
                ) {
                    lastMessage.text.push(text);
                } else {
                    const author = getAuthor(authorId);
                    list.push({
                        type: ChatMessageTypes.text,
                        text: [text],
                        author,
                        date: new Date()
                    });
                }
                return list;
            });
        },

        reInitialize(){
            update(() => {
                return [];
            })
        }
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
export const timeLineOpenedStore = writable<boolean>(false);

export const writingStatusMessageStore = writable<Set<PlayerInterface>>(new Set<PlayerInterface>())

export const chatInputFocusStore = writable(false);

export const chatPeerConexionInprogress = writable<boolean>(false);
