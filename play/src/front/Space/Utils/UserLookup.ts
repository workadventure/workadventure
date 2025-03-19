import { Unsubscriber } from "svelte/store";
import { SpaceFilterInterface, SpaceUserExtended } from "../SpaceFilter/SpaceFilter";
import { gameManager } from "../../Phaser/Game/GameManager";

/**
 * Waits for the user whose id is "id" to be present in the space.
 */
export function lookupUserById(
    id: number,
    spaceFilter: SpaceFilterInterface,
    timeout?: number
): Promise<SpaceUserExtended> {
    const promise = new Promise<SpaceUserExtended>((resolve, reject) => {
        let instantUnsubscribe = false;
        let unsubscribe: Unsubscriber | undefined;
        // eslint-disable-next-line prefer-const
        unsubscribe = spaceFilter.usersStore.subscribe((users) => {
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
            reject(
                new Error("Promise timed out while waiting for user with id " + id + " to be present in the space.")
            );
        }, timeout);
    });

    return Promise.race([promise, timeoutPromise]);
}
