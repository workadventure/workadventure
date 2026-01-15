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

    public static doRectanglesOverlap(
        r1: { x: number; y: number; width: number; height: number },
        r2: { x: number; y: number; width: number; height: number }
    ): boolean {
        return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x && r1.y < r2.y + r2.height && r1.height + r1.y > r2.y;
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

    public static randomPositionFromRect(
        rectangle: { x: number; y: number; width: number; height: number },
        margin = 0
    ): { x: number; y: number } {
        return {
            x: this.randomFrom(rectangle.x + margin, rectangle.x + rectangle.width - margin),
            y: this.randomFrom(rectangle.y + margin, rectangle.y + rectangle.height - margin),
        };
    }

    public static distanceBetween(p1: { x: number; y: number }, p2: { x: number; y: number }, squared = true): number {
        const distance = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
        return squared ? Math.sqrt(distance) : distance;
    }

    /**
     * Calculates the minimum distance between two rectangles.
     * Returns 0 if the rectangles overlap or touch.
     * @param r1 First rectangle
     * @param r2 Second rectangle
     * @returns The minimum distance between the two rectangles, or 0 if they overlap
     */
    public static distanceBetweenRectangles(
        r1: { x: number; y: number; width: number; height: number },
        r2: { x: number; y: number; width: number; height: number }
    ): number {
        // Check if rectangles overlap
        if (this.doRectanglesOverlap(r1, r2)) {
            return 0;
        }

        // Calculate the closest points between the two rectangles
        let dx = 0;
        let dy = 0;

        if (r1.x + r1.width < r2.x) {
            // r1 is to the left of r2
            dx = r2.x - (r1.x + r1.width);
        } else if (r2.x + r2.width < r1.x) {
            // r2 is to the left of r1
            dx = r1.x - (r2.x + r2.width);
        }

        if (r1.y + r1.height < r2.y) {
            // r1 is above r2
            dy = r2.y - (r1.y + r1.height);
        } else if (r2.y + r2.height < r1.y) {
            // r2 is above r1
            dy = r1.y - (r2.y + r2.height);
        }

        return Math.sqrt(dx * dx + dy * dy);
    }

    public static randomFromArray<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)];
    }

    public static randomFrom(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
}
