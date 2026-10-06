import { Subject } from "rxjs";
import { describe, expect, it } from "vitest";
import type { PositionInterface } from "../src/Movable";
import { SpatialMap } from "../src/SpatialMap";

class TestMovable {
    private readonly movedSubject = new Subject<PositionInterface>();
    public readonly moved$ = this.movedSubject.asObservable();

    public constructor(
        private x: number,
        private y: number,
    ) {}

    public getPosition(): PositionInterface {
        return { x: this.x, y: this.y };
    }

    public moveTo(x: number, y: number): void {
        this.x = x;
        this.y = y;
        this.movedSubject.next({ x, y });
    }
}

describe("SpatialMap", () => {
    it("should update query results when a value moves", () => {
        const spatialMap = new SpatialMap<string, TestMovable>(10);
        const movable = new TestMovable(0, 0);

        spatialMap.set("movable", movable);

        expect(spatialMap.queryCircle(0, 0, 5)).toEqual([movable]);

        movable.moveTo(100, 100);

        expect(spatialMap.queryCircle(0, 0, 5)).toEqual([]);
        expect(spatialMap.queryCircle(100, 100, 5)).toEqual([movable]);
    });

    it("should stop tracking a value after delete", () => {
        const spatialMap = new SpatialMap<string, TestMovable>(10);
        const movable = new TestMovable(0, 0);

        spatialMap.set("movable", movable);
        spatialMap.delete("movable");
        movable.moveTo(100, 100);

        expect(spatialMap.queryCircle(100, 100, 5)).toEqual([]);
    });
});
