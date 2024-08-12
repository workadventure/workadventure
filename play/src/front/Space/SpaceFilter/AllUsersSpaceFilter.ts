import { RoomConnection } from "../../Connection/RoomConnection";
import { SpaceFilter, SpaceFilterInterface } from "./SpaceFilter";

export interface AllUsersSpaceFilterInterface extends SpaceFilterInterface {
    filterByName(searchText: string): void;
}

export class AllUsersSpaceFilter extends SpaceFilter {
    constructor(_name: string, _spaceName: string, _connection: RoomConnection) {
        super(_name, _spaceName, _connection, {
            $case: "spaceFilterEverybody",
            spaceFilterEverybody: {},
        });
    }

    public filterByName(searchText: string): void {
        if (searchText === "") {
            this.setFilter({
                $case: "spaceFilterEverybody",
                spaceFilterEverybody: {},
            });
            return;
        }

        this.setFilter({
            $case: "spaceFilterContainName",
            spaceFilterContainName: {
                value: searchText,
            },
        });
    }
}
