import { RoomConnectionForSpacesInterface } from "../SpaceRegistry/SpaceRegistry";
import { SpaceInterface } from "../SpaceInterface";
import { PeerStoreInterface } from "../Space";
import { SpaceFilter, SpaceFilterInterface } from "./SpaceFilter";

export interface AllUsersSpaceFilterInterface extends SpaceFilterInterface {
    filterByName(searchText: string): void;
}

export class AllUsersSpaceFilter extends SpaceFilter {
    constructor(
        _name: string,
        _space: SpaceInterface,
        _connection: RoomConnectionForSpacesInterface,
        _peerStore: PeerStoreInterface,
        _screenSharingPeerStore: PeerStoreInterface
    ) {
        super(
            _name,
            _space,
            _connection,
            {
                $case: "spaceFilterEverybody",
                spaceFilterEverybody: {},
            },
            _peerStore,
            _screenSharingPeerStore
        );
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
