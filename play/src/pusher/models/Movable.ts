import type { PositionInterface } from "../models/PositionInterface.ts";

/**
 * A physical object that can be placed into a Zone
 */
export interface Movable {
    getPosition(): PositionInterface;
}
