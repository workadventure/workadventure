import { Readable, derived } from "svelte/store";
import { PartialChatUser } from "../Connection/ChatConnection";
import { SpaceInterface } from "../../Space/SpaceInterface";
import { CONNECTED_USER_FILTER_NAME } from "../../Space/Space";
import { SpaceFilterInterface } from "../../Space/SpaceFilter/SpaceFilter";
import { UserProvideInterface } from "./UserProvideInterface";
import { mapExtendedSpaceUserToChatUser } from "./ChatUserMapper";

export class WorldUserProvider implements UserProvideInterface {
    users: Readable<PartialChatUser[]>;
    private _filter: SpaceFilterInterface | undefined;

    constructor(allUsersInWorldSpace: SpaceInterface) {
        this._filter = allUsersInWorldSpace.watch(CONNECTED_USER_FILTER_NAME);

        this._filter.setFilter({
            $case: "spaceFilterEverybody",
            spaceFilterEverybody: {},
        });

        this.users = derived(
            this._filter.usersStore,
            (users) => {
                return Array.from(users.values()).map(mapExtendedSpaceUserToChatUser);
            },
            []
        );
    }

    setFilter(searchText: string): Promise<void> {
        return new Promise((res, _) => {
            if (!this._filter) return;

            if (searchText === "") {
                this._filter.setFilter({
                    $case: "spaceFilterEverybody",
                    spaceFilterEverybody: {},
                });
                res();
                return;
            }

            this._filter.setFilter({
                $case: "spaceFilterContainName",
                spaceFilterContainName: {
                    value: searchText,
                },
            });
            res();
        });
    }
}
