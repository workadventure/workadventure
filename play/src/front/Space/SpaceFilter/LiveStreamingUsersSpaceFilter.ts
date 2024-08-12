import { RoomConnection } from "../../Connection/RoomConnection";
import { SpaceFilter } from "./SpaceFilter";

export class LiveStreamingUsersSpaceFilter extends SpaceFilter {
    constructor(_name: string, _spaceName: string, _connection: RoomConnection) {
        super(_name, _spaceName, _connection, {
            $case: "spaceFilterLiveStreaming",
            spaceFilterLiveStreaming: {},
        });
    }
}
