import type { PlayerInterface } from "./PlayerInterface";
import { PositionMessage } from "../../Messages/ts-proto-generated/protos/messages";

export interface AddPlayerInterface extends PlayerInterface {
    position: PositionMessage;
}
