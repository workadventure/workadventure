import { writable } from "svelte/store";
import PopUpCameraFollow from "../Components/PopUp/PopUpCameraFollow.svelte";
import { popupStore } from "./PopupStore";

export const cameraFollowTargetStore = writable<string | null>(null);

export const cameraFollowSubscription = cameraFollowTargetStore.subscribe((targetUuid) => {
    if (targetUuid !== null) {
        popupStore.addPopup(PopUpCameraFollow, { targetUuid }, "popupCameraFollow");
    } else {
        popupStore.removePopup("popupCameraFollow");
    }
});
