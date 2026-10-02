import { get } from "svelte/store";
import { beforeEach, describe, expect, it } from "vitest";
import { createBiggestAvailableAreaStore } from "./BiggestAvailableAreaStore";

function setElementSize(element: HTMLElement, width: number, height: number): void {
    Object.defineProperty(element, "offsetWidth", { configurable: true, value: width });
    Object.defineProperty(element, "offsetHeight", { configurable: true, value: height });
}

describe("BiggestAvailableAreaStore", () => {
    beforeEach(() => {
        document.body.innerHTML = "";

        const game = document.createElement("div");
        game.id = "game";
        setElementSize(game, 100, 100);
        document.body.append(game);
    });

    it("uses registered blocker bounds when recomputing the biggest available area", () => {
        const store = createBiggestAvailableAreaStore();
        const blocker = document.createElement("div");
        document.body.append(blocker);

        store.registerBlocker(blocker);
        store.updateBlockerBox(blocker, {
            xStart: 0,
            yStart: 0,
            xEnd: 60,
            yEnd: 100,
        });

        store.recompute();

        expect(get(store)).toEqual({
            xStart: 60,
            yStart: 0,
            xEnd: 100,
            yEnd: 100,
        });
    });

    it("removes blocker bounds after unregistering the blocker", () => {
        const store = createBiggestAvailableAreaStore();
        const blocker = document.createElement("div");
        document.body.append(blocker);

        const unregisterBlocker = store.registerBlocker(blocker);
        store.updateBlockerBox(blocker, {
            xStart: 0,
            yStart: 0,
            xEnd: 60,
            yEnd: 100,
        });
        unregisterBlocker();

        store.recompute();

        expect(get(store)).toEqual({
            xStart: 0,
            yStart: 0,
            xEnd: 100,
            yEnd: 100,
        });
    });

    it("coalesces multiple recompute requests into one pending recompute", () => {
        const store = createBiggestAvailableAreaStore();

        store.requestRecompute();
        store.requestRecompute();

        expect(store.consumePendingRecompute()).toBe(true);
        expect(store.consumePendingRecompute()).toBe(false);
    });
});
