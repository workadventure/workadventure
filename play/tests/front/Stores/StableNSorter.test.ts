import { describe, it, expect } from "vitest";
import { stableNSort } from "../../../src/front/Stores/StableNSorter";

interface TestItem {
    uniqueId: string;
    priority: number; // lower = more important
    label?: string;
}

function makeMap(items: TestItem[]): Map<string, TestItem> {
    return new Map(items.map((i) => [i.uniqueId, i]));
}

describe("stableNSort", () => {
    it("keeps only items that still exist and appends new ones", () => {
        const items = makeMap([
            { uniqueId: "a", priority: 5 },
            { uniqueId: "b", priority: 2 },
            { uniqueId: "c", priority: 3 },
        ]);
        const currentOrder = ["obsolete", "c", "a"]; // contains an obsolete item and is missing b

        const result = stableNSort(items, 2, currentOrder);

        expect(result.items.map((i) => i.uniqueId)).toEqual(currentOrder); // returned list mirrors currentOrder
        expect(currentOrder.includes("obsolete")).toBe(false); // obsolete removed
        expect(currentOrder).toContain("b"); // missing added
        expect(new Set(currentOrder)).toEqual(new Set(["c", "a", "b"]));
        expect(result.orderChanged).toBe(true); // order changed due to removal and addition
    });

    it("ensures the first n items contain exactly the n highest priority items (order not enforced)", () => {
        const items = makeMap([
            { uniqueId: "a", priority: 50 }, // lowest importance
            { uniqueId: "b", priority: 40 },
            { uniqueId: "c", priority: 10 }, // top 1
            { uniqueId: "d", priority: 20 }, // top 2
            { uniqueId: "e", priority: 30 }, // top 3
        ]);
        const currentOrder = ["a", "b", "c", "d", "e"]; // deliberately worst order for priorities

        const n = 3;
        const result = stableNSort(items, n, currentOrder);

        // d and b are swapped with a and e
        expect(result.items[0].uniqueId).toBe("d");
        expect(result.items[1].uniqueId).toBe("e");
        expect(result.items[2].uniqueId).toBe("c");
        expect(result.items[3].uniqueId).toBe("a");
        expect(result.items[4].uniqueId).toBe("b");
        expect(result.orderChanged).toBe(true);
    });

    it("is stable for equal priorities across multiple calls", () => {
        const items = makeMap([
            { uniqueId: "a", priority: 1 },
            { uniqueId: "b", priority: 1 },
            { uniqueId: "c", priority: 1 },
        ]);
        const currentOrder = ["a", "b", "c"]; // original order

        const first = stableNSort(items, 2, currentOrder);
        expect(first.items.map((i) => i.uniqueId)).toEqual(["a", "b", "c"]);

        // Add a new item with same priority; should appear after existing equal-priority items
        items.set("d", { uniqueId: "d", priority: 1 });
        const second = stableNSort(items, 2, currentOrder);
        expect(second.items.map((i) => i.uniqueId)).toEqual(["a", "b", "c", "d"]);
        expect(second.orderChanged).toBe(true); // order changed due to addition

        // Re-run again to ensure stability remains
        const third = stableNSort(items, 3, currentOrder);
        expect(third.items.map((i) => i.uniqueId)).toEqual(["a", "b", "c", "d"]);
        expect(third.orderChanged).toBe(false);
    });

    it("handles n greater than collection size", () => {
        const items = makeMap([
            { uniqueId: "x", priority: 2 },
            { uniqueId: "y", priority: 1 },
        ]);
        const currentOrder: string[] = [];
        const result = stableNSort(items, 10, currentOrder);
        expect(result.items.map((i) => i.uniqueId).sort()).toEqual(["x", "y"].sort());
        expect(currentOrder.sort()).toEqual(["x", "y"].sort());
    });

    it("removes deleted items on subsequent calls", () => {
        const items = makeMap([
            { uniqueId: "a", priority: 1 },
            { uniqueId: "b", priority: 2 },
            { uniqueId: "c", priority: 3 },
        ]);
        const currentOrder = ["a", "b", "c"]; // initial
        stableNSort(items, 2, currentOrder);
        // Delete b
        items.delete("b");
        const res = stableNSort(items, 2, currentOrder);
        expect(res.items.map((i) => i.uniqueId)).toEqual(["a", "c"]);
        expect(currentOrder).toEqual(["a", "c"]);
        expect(res.orderChanged).toBe(true);
    });
});
