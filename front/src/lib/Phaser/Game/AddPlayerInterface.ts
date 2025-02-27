import type { PositionMessage } from "@workadventure/messages";
import type { PlayerInterface } from "./PlayerInterface";

export interface AddPlayerInterface extends PlayerInterface {
    position: PositionMessage;
}
