import { Group } from "./Group";
import { PointInterface } from "./Websocket/PointInterface";
import {Zone} from "_Model/Zone";

export interface UserInterface {
    id: string,
    group?: Group,
    position: PointInterface,
    silent: boolean,
    listenedZones: Set<Zone>
}
