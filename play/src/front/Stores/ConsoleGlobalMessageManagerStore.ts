import { writable } from "svelte/store";
//import PopUpMessage from "../Components/PopUp/PopUpMessage.svelte";
//import { popupStore } from "./PopupStore";

//let message: string;

export const consoleGlobalMessageManagerVisibleStore = writable(false);

// FIXME: This file and PopUpMessage is dead code?
/*export const consoleGlobalMessageManagerVisibleStorePopup = consoleGlobalMessageManagerVisibleStore.subscribe(
    (globalMessage) => {
        if (globalMessage === true) {
            popupStore.addPopup(
                PopUpMessage,
                {
                    message: message,
                },
                "message"
            );
        } else {
            popupStore.removePopup("message");
        }
    }
);*/

//export const consoleGlobalMessageManagerFocusStore = writable(false);
