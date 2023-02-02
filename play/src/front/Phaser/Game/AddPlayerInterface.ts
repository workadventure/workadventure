import type { PlayerInterface } from "./PlayerInterface";
import type { PositionMessage } from "@workadventure/messages";

export interface AddPlayerInterface extends PlayerInterface {
    position: PositionMessage;
}
