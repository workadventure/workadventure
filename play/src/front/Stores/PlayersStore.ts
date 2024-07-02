import { writable } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import { Color } from "@workadventure/shared-utils";
import type { PlayerInterface } from "../Phaser/Game/PlayerInterface";
import type { RoomConnection } from "../Connection/RoomConnection";

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
            // The userJoinedMessageStream and userLeftMessageStream streams are completed in the RoomConnection. No need to unsubscribe.
            //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
            roomConnection.userJoinedMessageStream.subscribe((message) => {
                update((users) => {
                    users.set(message.userId, {
                        userId: message.userId,
                        name: message.name,
                        characterTextures: message.characterTextures,
                        visitCardUrl: message.visitCardUrl,
                        companionTexture: message.companionTexture,
                        userUuid: message.userUuid,
                        availabilityStatus: message.availabilityStatus,
                        color: Color.getColorByString(message.name),
                        chatID: message.chatID,
                    });
                    return users;
                });
            });
            //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
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
                    name,
                    characterTextures: [],
                    visitCardUrl: null,
                    availabilityStatus: AvailabilityStatus.ONLINE,
                    userUuid: "dummy",
                    color: Color.getColorByString(name),
                });
                return users;
            });
            return newUserId;
        },
    };
}

export const playersStore = createPlayersStore();
