import { PointInterface } from "./PointInterface.js";

export class Point implements PointInterface {
    constructor(
        public x: number,
        public y: number,
        public direction: string = "none",
        public moving: boolean = false
    ) {}
}
