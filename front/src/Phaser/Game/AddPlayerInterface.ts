import type { PlayerInterface } from "./PlayerInterface";
import { PositionMessage } from "@workadventure/messages";

export interface AddPlayerInterface extends PlayerInterface {
    position: PositionMessage;
}
