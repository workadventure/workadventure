import {SpaceFilterInterface, SpaceUserExtended} from "../SpaceFilter/SpaceFilter";


/**
 * Waits for the user whose id is "id" to be present in the space.
 */
export function lookupUserById(id: number, spaceFilter: SpaceFilterInterface, timeout ?: number ): Promise<SpaceUserExtended> {
    const promise = new Promise<SpaceUserExtended>((resolve, reject) => {
        const unsubscribe = spaceFilter.usersStore.subscribe(users => {
            const user = users.get(id);
            if (user) {
                resolve(user);
                unsubscribe();
            }
        });
    });

    if (!timeout) {
        return promise;
    }

    const timeoutPromise = new Promise<SpaceUserExtended>((resolve, reject) => {
        setTimeout(() => {
            reject(new Error("Promise timed out while waiting for user with id " + id + " to be present in the space."));
        }, timeout);
    });

    return Promise.all([promise, timeoutPromise]).then(([user]) => user);
}

/**
 * Waits for the user whose property "property" is "value" to be present in the space.
 */
/*export function lookupUserByProperty<K extends keyof SpaceUserExtended>(property: K, value: SpaceUserExtended[K], spaceFilter: SpaceFilterInterface, timeout ?: number): Promise<SpaceUserExtended> {
    const promise = new Promise<SpaceUserExtended>((resolve, reject) => {
        const unsubscribe = spaceFilter.usersStore.subscribe(users => {
            const user = Array.from(users.values()).find(user => user[property] === value);
            if (user) {
                resolve(user);
                unsubscribe();
            }
        });
    });

    if (!timeout) {
        return promise;
    }

    const timeoutPromise = new Promise<SpaceUserExtended>((resolve, reject) => {
        setTimeout(() => {
            reject(new Error(`Promise timed out while waiting for user with property ${String(property)} to be present in the space.`));
        }, timeout);
    });

    return Promise.all([promise, timeoutPromise]).then(([user]) => user);
}*/
