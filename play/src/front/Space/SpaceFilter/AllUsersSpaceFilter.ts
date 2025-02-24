import { RoomConnectionForSpacesInterface } from "../SpaceRegistry/SpaceRegistry";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceFilter, SpaceFilterInterface } from "./SpaceFilter";

export interface AllUsersSpaceFilterInterface extends SpaceFilterInterface {
    filterByName(searchText: string): void;
}

export class AllUsersSpaceFilter extends SpaceFilter {
    constructor(_name: string, _space: SpaceInterface, _connection: RoomConnectionForSpacesInterface) {
        super(_name, _space, _connection, {
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
