import type { PositionInterface } from "../models/PositionInterface";

/**
 * A physical object that can be placed into a Zone
 */
export interface Movable {
    getPosition(): PositionInterface;
}
