import type { PlayerInterface } from "./PlayerInterface";
import type { PositionMessage } from "../../../messages/ts-proto-generated/protos/messages";

export interface AddPlayerInterface extends PlayerInterface {
    position: PositionMessage;
}
