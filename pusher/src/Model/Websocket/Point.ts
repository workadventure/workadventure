import { PointInterface } from "./PointInterface";

export class Point implements PointInterface {
    constructor(
        public x: number,
        public y: number,
        public direction: string = "none",
        public moving: boolean = false
    ) {}
}
