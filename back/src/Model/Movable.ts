import type { PositionInterface } from "../Model/PositionInterface.ts";

/**
 * A physical object that can be placed into a Zone
 */
export interface Movable {
    getPosition(): PositionInterface;
}
