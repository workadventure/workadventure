import { RoomConnectionForSpacesInterface } from "../SpaceRegistry/SpaceRegistry";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceFilter } from "./SpaceFilter";

export class LiveStreamingUsersSpaceFilter extends SpaceFilter {
    constructor(_name: string, _space: SpaceInterface, _connection: RoomConnectionForSpacesInterface) {
        super(_name, _space, _connection, {
            $case: "spaceFilterLiveStreaming",
            spaceFilterLiveStreaming: {},
        });
    }
}
