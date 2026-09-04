import { describe, expect, it, vi } from "vitest";
import { isMediaBreakpointUp } from "./BreakpointsUtils";

function withWindowWidth(width: number, callback: () => void): void {
    vi.stubGlobal("window", { innerWidth: width });
    try {
        callback();
    } finally {
        vi.unstubAllGlobals();
    }
}

describe("isMediaBreakpointUp", () => {
    it("is true below the next breakpoint and false at or above it", () => {
        withWindowWidth(991, () => expect(isMediaBreakpointUp("md")).toBe(true));
        withWindowWidth(992, () => expect(isMediaBreakpointUp("md")).toBe(false));
    });

    it("is always true for the largest breakpoint", () => {
        withWindowWidth(4000, () => expect(isMediaBreakpointUp("xxl")).toBe(true));
    });
});
