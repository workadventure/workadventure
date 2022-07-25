import {get, writable} from "svelte/store";
import {SingleRoom, User} from "../Xmpp/SingleRoom";
import {connectionStore} from "./ConnectionStore";
import jid from "@xmpp/jid";
import { EJABBERD_DOMAIN } from "../Enum/EnvironmentVariable";

function createSingleRoomsStore() {
  const { subscribe, update, set } = writable<Set<SingleRoom>>(new Set<SingleRoom>());

  return {
    subscribe,
    getOrCreateSingleRoom(user: User){
      return [...get(singleRoomsStore)].find((singleRoom: SingleRoom) => singleRoom.user === user) ?? new SingleRoom(get(connectionStore), user, new jid.JID(null, EJABBERD_DOMAIN), "test")
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
