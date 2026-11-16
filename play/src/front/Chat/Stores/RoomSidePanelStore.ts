import { get, writable } from "svelte/store";
import type { ChatConversation, RoomFolder } from "../Connection/ChatConnection";
import { selectedThreadStore } from "./SelectedThreadStore";

export type RoomSidePanelSection = "home" | "threads" | "polls" | "participants" | "questions" | "settings";
export type RoomTimelineFocusRequest = {
    roomId: string;
    eventId: string;
    sequence: number;
};

type RoomSidePanelState = {
    isOpen: boolean;
    activeSection: RoomSidePanelSection;
};

const DEFAULT_STATE: RoomSidePanelState = {
    isOpen: false,
    activeSection: "home",
};

export const roomTimelineFocusStore = writable<RoomTimelineFocusRequest | undefined>(undefined);

/** The folder whose members are shown in the conversation column, in place of a conversation. */
export const folderPanelStore = writable<RoomFolder | undefined>(undefined);

/**
 * Set when a menu opens a Members section: once its list is loaded, that section moves the focus into it
 * (and clears the request), so switching rooms with the section already open never steals the focus.
 */
export const membersFocusRequestStore = writable(false);

const createRoomSidePanelStore = () => {
    const { subscribe, set: baseSet, update } = writable<RoomSidePanelState>(DEFAULT_STATE);
    let currentRoomId: string | undefined;
    let focusSequence = 0;

    return {
        subscribe,
        open(section?: RoomSidePanelSection) {
            update((state) => ({
                isOpen: true,
                activeSection: section ?? state.activeSection,
            }));
        },
        close() {
            update((state) => ({
                ...state,
                isOpen: false,
            }));
        },
        toggle(section?: RoomSidePanelSection) {
            update((state) => ({
                isOpen: !state.isOpen,
                activeSection: section ?? state.activeSection,
            }));
        },
        setActiveSection(section: RoomSidePanelSection) {
            update((state) => ({
                ...state,
                isOpen: true,
                activeSection: section,
            }));
        },
        focusTimelineEvent(roomId: string, eventId: string) {
            focusSequence += 1;
            roomTimelineFocusStore.set({
                roomId,
                eventId,
                sequence: focusSequence,
            });
        },
        syncWithRoom(selectedRoom: ChatConversation | undefined) {
            const nextRoomId = selectedRoom?.conversationKind === "room" ? selectedRoom.id : undefined;
            const roomChanged = currentRoomId !== nextRoomId;
            const hadSelectedThread = get(selectedThreadStore) !== undefined;

            currentRoomId = nextRoomId;

            update((state) => {
                if (!nextRoomId) {
                    return DEFAULT_STATE;
                }

                if (!roomChanged) {
                    return state;
                }

                return {
                    isOpen: state.isOpen,
                    activeSection: hadSelectedThread ? "threads" : state.activeSection,
                };
            });
        },
        reset() {
            currentRoomId = undefined;
            baseSet(DEFAULT_STATE);
            roomTimelineFocusStore.set(undefined);
        },
    };
};

export const roomSidePanelStore = createRoomSidePanelStore();
