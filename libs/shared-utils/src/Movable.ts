import type { Observable } from "rxjs";

export interface PositionInterface {
    x: number;
    y: number;
}

/**
 * A physical object that can be indexed by position.
 */
export interface Movable {
    getPosition(): PositionInterface;
    moved$: Observable<PositionInterface>;
}
