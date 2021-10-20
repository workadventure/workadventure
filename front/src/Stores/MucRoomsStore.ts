import { writable } from "svelte/store";
import type {MucRoom} from "../Xmpp/MucRoom";

export const mucRoomsVisibilityStore = writable(false);

function createMucRoomsStore() {
    const { subscribe, update } = writable<Set<MucRoom>>(new Set<MucRoom>());

    return {
        subscribe,
        addMucRoom(mucRoom: MucRoom) {
            update((set) => {
                set.add(mucRoom);
                return set;
            });
        },
        removeMucRoom(mucRoom: MucRoom) {
            update((set) => {
                set.delete(mucRoom);
                return set;
            });
        },
    };
}
export const mucRoomsStore = createMucRoomsStore();
