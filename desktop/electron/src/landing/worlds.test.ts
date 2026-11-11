import { expect, it } from "vitest";
import { hashString, mergeWorlds } from "./worlds";

it("puts pinned worlds first, once each, and drops malformed entries", () => {
    const pinned = [{ url: "b", label: "B", pinned: false }];
    const recent = [{ url: "a", label: "A", pinned: false }, { url: "b", label: "B again", pinned: false }, { url: 3 }];
    expect(mergeWorlds(pinned, recent)).toEqual([
        { url: "b", label: "B", pinned: true },
        { url: "a", label: "A", pinned: false },
    ]);
    expect(mergeWorlds(undefined, null)).toEqual([]);
});

it("keeps every world's tile colour from before the Svelte port", () => {
    expect(hashString("https://play.workadventu.re/@/org/world/room")).toBe(158421729);
});
