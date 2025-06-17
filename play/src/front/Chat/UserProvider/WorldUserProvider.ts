import { Readable, derived } from "svelte/store";
import { PartialChatUser } from "../Connection/ChatConnection";
import { SpaceInterface } from "../../Space/SpaceInterface";
import { UserProviderInterface } from "./UserProviderInterface";
import { mapExtendedSpaceUserToChatUser } from "./ChatUserMapper";

export class WorldUserProvider implements UserProviderInterface {
    public readonly users: Readable<PartialChatUser[]>;
    public readonly userCount: Readable<number>;

    constructor(allUsersInWorldSpace: SpaceInterface) {
        this.users = derived(
            allUsersInWorldSpace.usersStore,
            (users) => {
                return Array.from(users.values()).map(mapExtendedSpaceUserToChatUser);
            },
            []
        );
        this.userCount = derived(this.users, (users) => {
            // TOOD FIXME: this is workaround for the fact that we are not using the uuid as the key in the map
            return new Set(users.map((user) => user.uuid)).size;
        });
    }

    setFilter(searchText: string): Promise<void> {
        //TODO : plus de notion de filterByName
        //TODO : gerer le filtre dans le front
        return Promise.resolve();
    }
}
