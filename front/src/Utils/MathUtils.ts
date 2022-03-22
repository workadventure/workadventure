export class MathUtils {
    /**
     *
     * @param p Position to check.
     * @param r Rectangle to check the overlap against.
     * @returns true is overlapping
     */
    public static isOverlappingWithRectangle(
        p: { x: number; y: number },
        r: { x: number; y: number; width: number; height: number }
    ): boolean {
        return this.isBetween(p.x, r.x, r.x + r.width) && this.isBetween(p.y, r.y, r.y + r.height);
    }

    /**
     *
     * @param value Value to check
     * @param min inclusive min value
     * @param max inclusive max value
     * @returns true if value is in <min, max>
     */
    public static isBetween(value: number, min: number, max: number): boolean {
        return value >= min && value <= max;
    }

    public static distanceBetween(
        p1: { x: number; y: number },
        p2: { x: number; y: number },
        squared: boolean = true
    ): number {
        const distance = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
        return squared ? Math.sqrt(distance) : distance;
    }

    public static randomFromArray<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)];
    }
}
