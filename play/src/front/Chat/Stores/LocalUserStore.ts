import { UserData } from "@workadventure/messages";
import { get, writable } from "svelte/store";

function createUserStore() {
    const { subscribe, update, set } = writable<UserData>();

    return {
        subscribe,
        update,
        set,
        get: () => get(userStore),
    };
}

export const userStore = createUserStore();

/*
{
    email : localUserStore.getLocalUser()?.email,
    uuid : localUserStore.getLocalUser()?.uuid||"",
    name,
    playUri,
    authToken: localUserStore.getAuthToken()||undefined,
    color: Color.getColorByString(name ?? ""),
    woka: wokaSrc,
    isLogged: localUserStore.isLogged(),
    availabilityStatus: get(availabilityStatusStore),
    roomName: connectionManager.currentRoom?.roomName ?? "default",
    visitCardUrl: gameManager.myVisitCardUrl,
    userRoomToken: gameManager.getCurrentGameScene().connection?.userRoomToken,
    klaxoonToolActivated: connectionManager.currentRoom?.klaxoonToolActivated||false,
    youtubeToolActivated: connectionManager.currentRoom?.youtubeToolActivated||false,
    googleDocsToolActivated: connectionManager.currentRoom?.googleDocsToolActivated||false,
    googleSheetsToolActivated:
        connectionManager.currentRoom?.googleSheetsToolActivated||false,
    googleSlidesToolActivated:
        connectionManager.currentRoom?.googleSlidesToolActivated||false,
    klaxoonToolClientId: connectionManager.currentRoom?.klaxoonToolClientId,
    eraserToolActivated: connectionManager.currentRoom?.eraserToolActivated||false,
}
*/