import { Readable, derived } from "svelte/store";
import { PartialChatUser } from "../Connection/ChatConnection";
import { SpaceInterface } from "../../Space/SpaceInterface";
import { AllUsersSpaceFilterInterface } from "../../Space/SpaceFilter/AllUsersSpaceFilter";
import { UserProviderInterface } from "./UserProviderInterface";
import { mapExtendedSpaceUserToChatUser } from "./ChatUserMapper";

export class WorldUserProvider implements UserProviderInterface {
    users: Readable<PartialChatUser[]>;
    private readonly _filter: AllUsersSpaceFilterInterface;

    constructor(allUsersInWorldSpace: SpaceInterface) {
        this._filter = allUsersInWorldSpace.watchAllUsers();

        this.users = derived(
            this._filter.usersStore,
            (users) => {
                return Array.from(users.values()).map(mapExtendedSpaceUserToChatUser);
            },
            []
        );
    }

    setFilter(searchText: string): Promise<void> {
        this._filter.filterByName(searchText);
        return Promise.resolve();
    }
}
