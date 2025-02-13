import { describe, it, expect, vi } from "vitest";
import { SearchableArrayStore } from "../src/SearchableArrayStore";

// Sample item type for testing
type Item = { id: number; name: string };

describe("SearchableArrayStore", () => {
    const getKey = (item: Item) => item.id;

    it("should add new items and trigger subscriptions", async () => {
        const store = new SearchableArrayStore(getKey);
        const subscription = vi.fn();

        // Subscribe to the store
        store.subscribe(subscription);

        // Push new items
        store.push({ id: 1, name: "Item 1" });
        store.push({ id: 2, name: "Item 2" });

        // Verify store state
        expect(store.length).toBe(2);
        expect(store[0].name).toBe("Item 1");

        // Verify subscription calls
        expect(subscription).toHaveBeenCalledTimes(3); // initial + each push
    });

    it("should retrieve an item by key", () => {
        const store = new SearchableArrayStore(getKey);
        store.push({ id: 1, name: "Item 1" });

        const item = store.get(1);
        expect(item?.name).toBe("Item 1");
    });

    it("should delete an item by key", () => {
        const store = new SearchableArrayStore(getKey);
        store.push({ id: 1, name: "Item 1" });
        const deleted = store.delete(1);

        expect(deleted).toBe(true);
        expect(store.length).toBe(0);
        expect(store.get(1)).toBeUndefined();
    });

    it("should update an existing item by key", () => {
        const store = new SearchableArrayStore(getKey);
        store.push({ id: 1, name: "Item 1" });

        store.update({ id: 1, name: "Updated Item 1" });
        const item = store.get(1);

        expect(item?.name).toBe("Updated Item 1");
    });

    it("should notify on new item push", async () => {
        const store = new SearchableArrayStore(getKey);
        const item = { id: 1, name: "New Item" };

        let pushedItem;
        store.onPush.subscribe((item) => (pushedItem = item));
        store.push(item);

        expect(pushedItem).toEqual(item);
    });

    it("should handle unshift method correctly", () => {
        const store = new SearchableArrayStore(getKey);
        store.unshift({ id: 1, name: "Item 1" });
        store.unshift({ id: 2, name: "Item 2" });

        expect(store[0].id).toBe(2);
        expect(store.length).toBe(2);
    });

    it("should clear the store", () => {
        const store = new SearchableArrayStore(getKey);
        store.push({ id: 1, name: "Item 1" });
        store.clear();

        expect(store.length).toBe(0);
        expect(store.get(1)).toBeUndefined();
    });

    it("should correctly reverse the array", () => {
        const store = new SearchableArrayStore(getKey);
        store.push({ id: 1, name: "Item 1" });
        store.push({ id: 2, name: "Item 2" });

        store.reverse();
        expect(store[0].id).toBe(2);
        expect(store[1].id).toBe(1);
    });

    it("should correctly shift the first item", () => {
        const store = new SearchableArrayStore(getKey);
        store.push({ id: 1, name: "Item 1" });
        store.push({ id: 2, name: "Item 2" });

        const shifted = store.shift();
        expect(shifted?.id).toBe(1);
        expect(store.length).toBe(1);
    });

    it("should correctly pop the last item", () => {
        const store = new SearchableArrayStore(getKey);
        store.push({ id: 1, name: "Item 1" });
        store.push({ id: 2, name: "Item 2" });

        const popped = store.pop();
        expect(popped?.id).toBe(2);
        expect(store.length).toBe(1);
    });

    it("should correctly splice items", () => {
        const store = new SearchableArrayStore(getKey);
        store.push({ id: 1, name: "Item 1" });
        store.push({ id: 2, name: "Item 2" });
        store.push({ id: 3, name: "Item 3" });

        store.splice(1, 1);
        expect(store.length).toBe(2);
        expect(store[0].id).toBe(1);
        expect(store[1].id).toBe(3);
    });

    it("should return the correct value for has(key)", () => {
        const store = new SearchableArrayStore(getKey);
        store.push({ id: 1, name: "Item 1" });

        expect(store.has(1)).toBe(true);
        expect(store.has(2)).toBe(false);
    });
});
