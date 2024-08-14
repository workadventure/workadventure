import { RoomConnection } from "../../Connection/RoomConnection";
import {SpaceInterface} from "../SpaceInterface";
import { SpaceFilter } from "./SpaceFilter";

export class LiveStreamingUsersSpaceFilter extends SpaceFilter {
    constructor(_name: string, _space: SpaceInterface, _connection: RoomConnection) {
        super(_name, _space, _connection, {
            $case: "spaceFilterLiveStreaming",
            spaceFilterLiveStreaming: {},
        });
    }
}
