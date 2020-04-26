import { Group } from "./Group";
import { PointInterface } from "./Websocket/PointInterface";

export interface UserInterface {
    id: string,
    group?: Group,
    position: PointInterface
}