type SpatialHashGridEntry<T> = {
    x: number;
    y: number;
    value: T;
};

/**
 * Small spatial index for objects positioned in world coordinates.
 *
 * It is used to avoid scanning every object when callers only need objects close to a point. Objects are stored
 * in fixed-size grid cells, so circular queries only inspect cells intersecting the query bounds before applying
 * an exact distance check.
 */
export class SpatialHashGrid<T> {
    private readonly cells = new Map<string, Map<string | number, SpatialHashGridEntry<T>>>();
    private readonly entries = new Map<string | number, SpatialHashGridEntry<T>>();

    constructor(private readonly cellSize: number) {}

    public clear(): void {
        this.cells.clear();
        this.entries.clear();
    }

    /**
     * Inserts or updates an object position.
     */
    public set(id: string | number, x: number, y: number, value: T): void {
        // An entry belongs to exactly one cell. Replacing first keeps updates simple when an object crosses cells.
        this.delete(id);

        const entry = { x, y, value };
        const cellKey = this.getCellKeyFromPosition(x, y);
        let cell = this.cells.get(cellKey);
        if (cell === undefined) {
            cell = new Map<string | number, SpatialHashGridEntry<T>>();
            this.cells.set(cellKey, cell);
        }

        cell.set(id, entry);
        this.entries.set(id, entry);
    }

    public delete(id: string | number): void {
        const entry = this.entries.get(id);
        if (entry === undefined) {
            return;
        }

        const cellKey = this.getCellKeyFromPosition(entry.x, entry.y);
        const cell = this.cells.get(cellKey);
        cell?.delete(id);
        if (cell?.size === 0) {
            this.cells.delete(cellKey);
        }
        this.entries.delete(id);
    }

    /**
     * Returns objects whose indexed position is inside the given circle.
     */
    public queryCircle(x: number, y: number, radius: number): T[] {
        const radiusSquared = radius * radius;
        // Visit every grid cell intersecting the query bounds, then filter entries by exact squared distance.
        const minCellX = this.getCellCoordinate(x - radius);
        const maxCellX = this.getCellCoordinate(x + radius);
        const minCellY = this.getCellCoordinate(y - radius);
        const maxCellY = this.getCellCoordinate(y + radius);
        const result = new Map<string | number, T>();

        for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
            for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
                const cell = this.cells.get(this.getCellKey(cellX, cellY));
                if (cell === undefined) {
                    continue;
                }

                for (const [id, entry] of cell) {
                    const dx = entry.x - x;
                    const dy = entry.y - y;
                    if (dx * dx + dy * dy <= radiusSquared) {
                        result.set(id, entry.value);
                    }
                }
            }
        }

        return Array.from(result.values());
    }

    private getCellKeyFromPosition(x: number, y: number): string {
        return this.getCellKey(this.getCellCoordinate(x), this.getCellCoordinate(y));
    }

    private getCellCoordinate(value: number): number {
        return Math.floor(value / this.cellSize);
    }

    private getCellKey(x: number, y: number): string {
        return `${x}:${y}`;
    }
}
