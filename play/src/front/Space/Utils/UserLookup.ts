import { Unsubscriber } from "svelte/store";
import { gameManager } from "../../Phaser/Game/GameManager";
import { SpaceInterface, SpaceUserExtended } from "../SpaceInterface";
import PopUpError from "../../Components/PopUp/PopUpError.svelte";
import { popupStore } from "../../Stores/PopupStore";

/**
 * Waits for the user whose id is "id" to be present in the space.
 */
export function lookupUserById(id: number, space: SpaceInterface, timeout?: number): Promise<SpaceUserExtended> {
    let unsubscribe: Unsubscriber | undefined;
    const promise = new Promise<SpaceUserExtended>((resolve, reject) => {
        let instantUnsubscribe = false;

        unsubscribe = space.usersStore.subscribe((users) => {
            const spaceUserId = gameManager.getCurrentGameScene().roomUrl + "_" + id;
            const user = users.get(spaceUserId);
            if (user) {
                resolve(user);
                // If the user is immediately found, the unsubscribe variable is not initialized yet.
                if (unsubscribe) {
                    unsubscribe();
                } else {
                    instantUnsubscribe = true;
                }
            }
        });
        if (instantUnsubscribe && unsubscribe) {
            unsubscribe();
        }
    });

    if (!timeout) {
        return promise;
    }

    const timeoutPromise = new Promise<SpaceUserExtended>((resolve, reject) => {
        setTimeout(() => {
            if (unsubscribe) {
                unsubscribe();
            }

            const errorMessage = `Promise timed out while waiting for user with id ${id} to be present in the space.`;

            const popupId = `user-lookup-timeout-${id}`;
            popupStore.addPopup(
                PopUpError,
                {
                    message: "",
                    click: () => {
                        popupStore.removePopup(popupId);
                    },
                    userInputManager: gameManager.getCurrentGameScene().userInputManager,
                },
                popupId
            );

            console.error(errorMessage);
            reject(new Error(errorMessage));
        }, timeout);
    });

    return Promise.race([promise, timeoutPromise]);
}
