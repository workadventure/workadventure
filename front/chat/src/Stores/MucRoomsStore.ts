import { writable } from "svelte/store";
import type { MucRoom } from "../Xmpp/MucRoom";

/**
 * True if the connection between the pusher and the XMPP server is established, false otherwise.
 */
export const xmppServerConnectionStatusStore = writable(false);
export const numberPresenceUserStore = writable(0);

function createMucRoomsStore() {
  const { subscribe, update, set } = writable<Set<MucRoom>>(new Set<MucRoom>());

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
    reset() {
      set(new Set<MucRoom>());
    },
  };
}
export const mucRoomsStore = createMucRoomsStore();
