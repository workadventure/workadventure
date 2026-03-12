import type { PositionMessage } from "@workadventure/messages";
import type { PlayerInterface } from "./PlayerInterface.ts";

export interface AddPlayerInterface extends PlayerInterface {
    position: PositionMessage;
}
