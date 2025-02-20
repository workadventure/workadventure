import { RoomConnectionForSpacesInterface } from "../SpaceRegistry/SpaceRegistry";
import { SpaceInterface } from "../SpaceInterface";
import { PeerStoreInterface } from "../Space";
import { SpaceFilter } from "./SpaceFilter";

export class LiveStreamingUsersSpaceFilter extends SpaceFilter {
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
                $case: "spaceFilterLiveStreaming",
                spaceFilterLiveStreaming: {},
            },
            _peerStore,
            _screenSharingPeerStore
        );
    }
}
