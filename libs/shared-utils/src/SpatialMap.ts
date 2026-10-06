import type { Subscription } from "rxjs";
import type { Movable, PositionInterface } from "./Movable";

type SpatialMapEntry<T> = {
    x: number;
    y: number;
    value: T;
    subscription?: Subscription;
};

/**
 * Map-like collection for movable objects positioned in world coordinates.
 *
 * Values are stored by key like a regular Map, and are also indexed in fixed-size grid cells. The spatial index is
 * updated automatically by subscribing to each value's moved$ observable.
 */
export class SpatialMap<K, V extends Movable> implements ReadonlyMap<K, V> {
    public readonly [Symbol.toStringTag] = "SpatialMap";

    private readonly cells = new Map<string, Map<K, SpatialMapEntry<V>>>();
    private readonly items = new Map<K, SpatialMapEntry<V>>();

    constructor(private readonly cellSize: number) {}

    public get size(): number {
        return this.items.size;
    }

    public clear(): void {
        for (const entry of this.items.values()) {
            entry.subscription?.unsubscribe();
        }
        this.cells.clear();
        this.items.clear();
    }

    public delete(key: K): boolean {
        const entry = this.items.get(key);
        if (entry === undefined) {
            return false;
        }

        entry.subscription?.unsubscribe();
        this.removeFromCell(key, entry);
        this.items.delete(key);
        return true;
    }

    public entries(): MapIterator<[K, V]> {
        return this.iterateEntries();
    }

    public forEach(callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void, thisArg?: unknown): void {
        for (const [key, value] of this.entries()) {
            callbackfn.call(thisArg, value, key, this);
        }
    }

    public get(key: K): V | undefined {
        return this.items.get(key)?.value;
    }

    public has(key: K): boolean {
        return this.items.has(key);
    }

    public keys(): MapIterator<K> {
        return this.items.keys();
    }

    /**
     * Returns values whose indexed position is inside the given circle.
     */
    public queryCircle(x: number, y: number, radius: number): V[] {
        const radiusSquared = radius * radius;
        // Visit every grid cell intersecting the query bounds, then filter entries by exact squared distance.
        const minCellX = this.getCellCoordinate(x - radius);
        const maxCellX = this.getCellCoordinate(x + radius);
        const minCellY = this.getCellCoordinate(y - radius);
        const maxCellY = this.getCellCoordinate(y + radius);
        const result = new Map<K, V>();

        for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
            for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
                const cell = this.cells.get(this.getCellKey(cellX, cellY));
                if (cell === undefined) {
                    continue;
                }

                for (const [key, entry] of cell) {
                    const dx = entry.x - x;
                    const dy = entry.y - y;
                    if (dx * dx + dy * dy <= radiusSquared) {
                        result.set(key, entry.value);
                    }
                }
            }
        }

        return Array.from(result.values());
    }

    public set(key: K, value: V): this {
        this.delete(key);

        const position = value.getPosition();
        const entry: SpatialMapEntry<V> = {
            x: position.x,
            y: position.y,
            value,
        };

        this.items.set(key, entry);
        this.addToCell(key, entry);
        entry.subscription = value.moved$.subscribe((position) => {
            this.updateEntryPosition(key, entry, position);
        });

        return this;
    }

    public values(): MapIterator<V> {
        return this.iterateValues();
    }

    public [Symbol.iterator](): MapIterator<[K, V]> {
        return this.entries();
    }

    private addToCell(key: K, entry: SpatialMapEntry<V>): void {
        const cellKey = this.getCellKeyFromPosition(entry.x, entry.y);
        let cell = this.cells.get(cellKey);
        if (cell === undefined) {
            cell = new Map<K, SpatialMapEntry<V>>();
            this.cells.set(cellKey, cell);
        }
        cell.set(key, entry);
    }

    private getCellCoordinate(value: number): number {
        return Math.floor(value / this.cellSize);
    }

    private getCellKey(x: number, y: number): string {
        return `${x}:${y}`;
    }

    private getCellKeyFromPosition(x: number, y: number): string {
        return this.getCellKey(this.getCellCoordinate(x), this.getCellCoordinate(y));
    }

    private *iterateEntries(): MapIterator<[K, V]> {
        for (const [key, entry] of this.items) {
            yield [key, entry.value];
        }
    }

    private *iterateValues(): MapIterator<V> {
        for (const entry of this.items.values()) {
            yield entry.value;
        }
    }

    private removeFromCell(key: K, entry: SpatialMapEntry<V>): void {
        const cellKey = this.getCellKeyFromPosition(entry.x, entry.y);
        const cell = this.cells.get(cellKey);
        cell?.delete(key);
        if (cell?.size === 0) {
            this.cells.delete(cellKey);
        }
    }

    private updateEntryPosition(key: K, entry: SpatialMapEntry<V>, position: PositionInterface): void {
        const oldCellKey = this.getCellKeyFromPosition(entry.x, entry.y);
        const newCellKey = this.getCellKeyFromPosition(position.x, position.y);

        if (oldCellKey !== newCellKey) {
            this.removeFromCell(key, entry);
        }

        entry.x = position.x;
        entry.y = position.y;

        if (oldCellKey !== newCellKey) {
            this.addToCell(key, entry);
        }
    }
}
