import type { PointInterface } from "./PointInterface.ts";

export class Point implements PointInterface {
    constructor(
        public x: number,
        public y: number,
        public direction: string = "none",
        public moving: boolean = false
    ) {}
}
