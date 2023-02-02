import { writable } from "svelte/store";
import type { PlayerInterface } from "../Phaser/Game/PlayerInterface";
import type { RoomConnection } from "../Connexion/RoomConnection";
import { AvailabilityStatus } from "@workadventure/messages";
import { getColorByString } from "../Components/Video/utils";
import { localUserStore } from "../Connexion/LocalUserStore";

let idCount = 0;

/**
 * A store that contains the list of players currently known.
 */
function createPlayersStore() {
    let players = new Map<number, PlayerInterface>();

    const { subscribe, set, update } = writable<Map<number, PlayerInterface>>(players);

    return {
        subscribe,
        connectToRoomConnection: (roomConnection: RoomConnection) => {
            players = new Map<number, PlayerInterface>();
            set(players);
            // TODO: it would be cool to unsubscribe properly here
            roomConnection.userJoinedMessageStream.subscribe((message) => {
                update((users) => {
                    users.set(message.userId, {
                        userId: message.userId,
                        userJid: message.userJid,
                        name: message.name,
                        characterLayers: message.characterLayers,
                        visitCardUrl: message.visitCardUrl,
                        companion: message.companion,
                        userUuid: message.userUuid,
                        availabilityStatus: message.availabilityStatus,
                        color: getColorByString(message.name),
                        isLogged: localUserStore.isLogged(),
                    });
                    return users;
                });
            });
            roomConnection.userLeftMessageStream.subscribe((message) => {
                update((users) => {
                    users.delete(message.userId);
                    return users;
                });
            });
        },
        getPlayerById(userId: number): PlayerInterface | undefined {
            return players.get(userId);
        },
        getPlayerByUuid(userUuid: string): PlayerInterface | undefined {
            for (const user of players.values()) {
                if (userUuid === user.userUuid) {
                    return user;
                }
            }

            return undefined;
        },
        addFacticePlayer(name: string): number {
            let userId: number | null = null;
            players.forEach((p) => {
                if (p.name === name) userId = p.userId;
            });
            if (userId) return userId;
            const newUserId = idCount--;
            update((users) => {
                users.set(newUserId, {
                    userId: newUserId,
                    userJid: "fake",
                    name,
                    characterLayers: [],
                    visitCardUrl: null,
                    companion: null,
                    availabilityStatus: AvailabilityStatus.ONLINE,
                    userUuid: "dummy",
                    color: getColorByString(name),
                    isLogged: localUserStore.isLogged(),
                });
                return users;
            });
            return newUserId;
        },
    };
}

export const playersStore = createPlayersStore();
