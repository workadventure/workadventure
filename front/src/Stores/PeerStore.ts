import { derived, writable, Writable } from "svelte/store";
import type {UserSimplePeerInterface} from "../WebRtc/SimplePeer";
import type {SimplePeer} from "../WebRtc/SimplePeer";

/**
 * A store that contains the camera state requested by the user (on or off).
 */
function createPeerStore() {
    let users = new Map<number, UserSimplePeerInterface>();

    const { subscribe, set, update } = writable(users);

    return {
        subscribe,
        connectToSimplePeer: (simplePeer: SimplePeer) => {
            users = new Map<number, UserSimplePeerInterface>();
            set(users);
            simplePeer.registerPeerConnectionListener({
                onConnect(user: UserSimplePeerInterface) {
                    update(users => {
                        users.set(user.userId, user);
                        return users;
                    });
                },
                onDisconnect(userId: number) {
                    update(users => {
                        users.delete(userId);
                        return users;
                    });
                }
            })
        }
    };
}

export const peerStore = createPeerStore();
