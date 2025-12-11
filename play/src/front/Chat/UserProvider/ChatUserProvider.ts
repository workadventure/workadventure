import type { Readable } from "svelte/store";
import { derived, writable } from "svelte/store";
import type { ChatConnectionInterface, PartialChatUser } from "../Connection/ChatConnection";
import type { UserProviderInterface } from "./UserProviderInterface";

export class ChatUserProvider implements UserProviderInterface {
    users: Readable<PartialChatUser[]>;
    private _searchText = writable("");

    constructor(chat: ChatConnectionInterface) {
        this.users = derived(
            [chat.directRoomsUsers, this._searchText],
            ([users, searchText]) => {
                return (
                    users.filter((user) => {
                        return user?.username?.toLocaleLowerCase().includes(searchText.toLocaleLowerCase());
                    }) || []
                );
            },
            []
        );
    }

    setFilter(searchText: string): Promise<void> {
        return new Promise((res, _) => {
            this._searchText.set(searchText);
            res();
        });
    }
}
