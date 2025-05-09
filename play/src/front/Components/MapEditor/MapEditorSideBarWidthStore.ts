import { writable } from "svelte/store";
import { localUserStore } from "../../Connection/LocalUserStore";

export const mapEditorSideBarWidthStore = writable(localUserStore.getMapEditorSideBarWidth());

// Not unsubscribing is ok, this is a singleton.
//eslint-disable-next-line svelte/no-ignored-unsubscribe
mapEditorSideBarWidthStore.subscribe((value) => {
    localUserStore.setMapEditorSideBarWidth(value);
});
