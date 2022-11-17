import { get, writable } from "svelte/store";
import type { SingleRoom } from "../Xmpp/SingleRoom";
import {ParsedJID} from "stanza/JID";
import {activeThreadStore} from "./ActiveThreadStore";
import {chatConnectionManager} from "../Connection/ChatConnectionManager";
import {JID} from "stanza";

function createSingleRoomsStore() {
    const { subscribe, update, set } = writable<Set<SingleRoom>>(new Set<SingleRoom>());

    return {
        subscribe,
        addSingleRoom(singleRoom: SingleRoom) {
            update((set) => {
                set.add(singleRoom);
                return set;
            });
        },
        removeSingleRoom(singleRoom: SingleRoom) {
            update((set) => {
                set.delete(singleRoom);
                return set;
            });
        },
        reset() {
            set(new Set<SingleRoom>());
        },
        sendPresences() {
            [...get(this).values()].forEach((singleRoom) => singleRoom.sendPresence());
        },
    };
}
export const singleRoomsStore = createSingleRoomsStore();
