import { writable } from "svelte/store";
import type { RoomConnection } from "../Connexion/RoomConnection";

/**
 * A store that contains the players avatars pictures
 */
function createUserWokaPictureStore() {
    let players = new Map<number, string>();

    const { subscribe, update } = writable(players);

    return {
        subscribe,
        connectToRoomConnection: (roomConnection: RoomConnection) => {
            roomConnection.onUserLeft((userId) => {
                update((users) => {
                    users.delete(userId);
                    return users;
                });
            });
        },
        setWokaPicture(userId: number, url: string) {
            update((users) => {
                users.set(userId, url);
                return users;
            });
        },
        getWokaPictureById(userId: number): string | undefined {
            return players.get(userId);
        },
    };
}

export const userWokaPictureStore = createUserWokaPictureStore();
