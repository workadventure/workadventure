import { writable } from "svelte/store";
import { PopUpMessage } from "../Components/PopUp/PopUpMessage.svelte";
import { popupStore } from "./PopupStore";


export const consoleGlobalMessageManagerVisibleStore = writable(false);
consoleGlobalMessageManagerVisibleStore.subscribe((globalMessage) => {
  if (globalMessage === true) {
    popupStore.addPopup(PopUpMessage);
  } else {
    popupStore.removePopup(PopUpMessage);
  }

});

export const consoleGlobalMessageManagerFocusStore = writable(false);
