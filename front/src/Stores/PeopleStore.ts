import { derived, writable } from "svelte/store";
import type { RoomConnection, UserList } from "../Connexion/RoomConnection";
import { PLAYER_RESOURCES } from "../Phaser/Entity/PlayerTextures";
import { playersStore } from "./PlayersStore";

export const peopleMenuVisible = writable(false);

interface Person {
    name: string;
    img?: string;
}

function convertUserList(userList: UserList, userId: number) {
    return userList
        .filter((user) => user.userid !== userId)
        .map((user) => ({ name: user.name, img: PLAYER_RESOURCES[user.characterlayername]?.img }));
}

export function createPeopleStore() {
    const { subscribe, set } = writable([] as Person[]);

    return {
        subscribe,
        connectToRoomConnection: (roomConnection: RoomConnection) => {
            set(convertUserList(roomConnection.getUserList(), roomConnection.getUserId()));

            roomConnection.onUserListUpdated((userList) => {
                set(convertUserList(userList, roomConnection.getUserId()));
            });
        },
    };
}

export const peopleStore = createPeopleStore();
