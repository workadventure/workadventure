import { PositionInterface } from "../Model/PositionInterface.js";

/**
 * A physical object that can be placed into a Zone
 */
export interface Movable {
    getPosition(): PositionInterface;
}
