import { writable } from "svelte/store";
import { ChatConnection } from "../Connection/ChatConnection";

function createConnectionStore() {
  const { subscribe, update, set } = writable<ChatConnection>();

  return {
    subscribe,
    update,
    set,
  };
}

export const connectionStore = createConnectionStore();
