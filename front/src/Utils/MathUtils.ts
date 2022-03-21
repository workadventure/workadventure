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

    /**
     *
     * @param baseWidth Object's default width not affected by any scaling
     * @param baseHeight Object's default height not affected by any scaling
     * @param requestedWidth Width we would like to achieve
     * @param requestedHeight Height we would like to achieve
     * @param unitSizeWidth Smallest possible unit of our 'scale step' for width
     * @param unitSizeHeight Smallest possible unit of our 'scale step' for height
     * @returns [ newWidth, newHeight ]
     */
    public static getWholePixelsNewSize(
        baseWidth: number,
        baseHeight: number,
        requestedWidth: number,
        requestedHeight: number,
        unitSizeWidth: number = 32,
        unitSizeHeight: number = 32
    ): [number, number] {
        // Demanded scale to be applied
        const newScaleW = requestedWidth / baseWidth;
        const newScaleH = requestedHeight / baseHeight;

        // How would it affect our sprites
        const spriteWidth = Math.floor(unitSizeWidth * newScaleW);
        const spriteHeight = Math.floor(unitSizeHeight * newScaleH);

        const restWidth = spriteWidth % unitSizeWidth;
        const restHeight = spriteWidth % unitSizeHeight;

        // Expected nearest sprite size to maintain crisp pixels
        const expectedSpriteWidth = spriteWidth - restWidth + (restWidth > unitSizeWidth / 2 ? unitSizeWidth : 0);
        const expectedSpriteHeight = spriteHeight - restHeight + (restHeight > unitSizeHeight / 2 ? unitSizeHeight : 0);

        // Expected nearest scale
        const neededScaleWidth = expectedSpriteWidth / unitSizeWidth;
        const neededScaleHeight = expectedSpriteHeight / unitSizeHeight;

        // Calculate new width and height and apply it to the whole container
        return [baseWidth * neededScaleWidth, baseHeight * neededScaleHeight];
    }
}
