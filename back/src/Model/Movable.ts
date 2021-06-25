import { PositionInterface } from "_Model/PositionInterface";

/**
 * A physical object that can be placed into a Zone
 */
export interface Movable {
    getPosition(): PositionInterface;
}
