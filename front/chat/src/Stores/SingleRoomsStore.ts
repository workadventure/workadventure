import {get, writable} from "svelte/store";
import {SingleRoom, User} from "../Xmpp/SingleRoom";
import {connectionStore} from "./ConnectionStore";
import jid from "@xmpp/jid";

function createSingleRoomsStore() {
  const { subscribe, update, set } = writable<Set<SingleRoom>>(new Set<SingleRoom>());

  return {
    subscribe,
    getOrCreateSingleRoom(userJid: string, user: User): SingleRoom{
      let singleRoom = [...get(singleRoomsStore)].find((singleRoom: SingleRoom) => singleRoom.user === user);
      if(!singleRoom){
        singleRoom = new SingleRoom(get(connectionStore), user, jid(userJid), get(connectionStore).getXmppClient()?.jid ?? '');
        this.addSingleRoom(singleRoom);
      }
      return singleRoom;
    },
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
  };
}
export const singleRoomsStore = createSingleRoomsStore();
