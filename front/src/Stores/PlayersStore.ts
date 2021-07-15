import { writable } from "svelte/store";
import type { PlayerInterface } from "../Phaser/Game/PlayerInterface";
import type { RoomConnection } from "../Connexion/RoomConnection";
import { getRandomColor } from "../WebRtc/ColorGenerator";

/**
 * A store that contains the list of players currently known.
 */
function createPlayersStore() {
    let players = new Map<number, PlayerInterface>();

    const { subscribe, set, update } = writable(players);

    return {
        subscribe,
        connectToRoomConnection: (roomConnection: RoomConnection) => {
            players = new Map<number, PlayerInterface>();
            set(players);
            roomConnection.onUserJoins((message) => {
                update((users) => {
                    users.set(message.userId, {
                        userId: message.userId,
                        name: message.name,
                        characterLayers: message.characterLayers,
                        visitCardUrl: message.visitCardUrl,
                        companion: message.companion,
                        userUuid: message.userUuid,
                        color: getRandomColor(),
                    });
                    return users;
                });
            });
            roomConnection.onUserLeft((userId) => {
                update((users) => {
                    users.delete(userId);
                    return users;
                });
            });
        },
        getPlayerById(userId: number): PlayerInterface | undefined {
            return players.get(userId);
        },
    };
}

export const playersStore = createPlayersStore();
