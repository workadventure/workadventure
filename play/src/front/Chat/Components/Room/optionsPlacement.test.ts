import { describe, expect, it } from "vitest";
import { pickOptionsPlacement } from "./optionsPlacement";

const bubble = { left: 0, right: 300, top: 100, bottom: 140 };
const bar = { width: 190, height: 34 };

describe("pickOptionsPlacement", () => {
    it("takes the end corner when nothing is above it", () => {
        expect(pickOptionsPlacement(bubble, bar, [], false)).toBe("end");
        // A shorter bubble above leaves the end corner free.
        expect(pickOptionsPlacement(bubble, bar, [{ left: 0, right: 90, top: 60, bottom: 97 }], false)).toBe("end");
    });

    it("moves to the start corner when the time of the message above is under the end one", () => {
        expect(pickOptionsPlacement(bubble, bar, [{ left: 240, right: 300, top: 80, bottom: 96 }], false)).toBe(
            "start",
        );
    });

    it("stays at the end when both corners are taken", () => {
        expect(pickOptionsPlacement(bubble, bar, [{ left: 0, right: 300, top: 60, bottom: 98 }], false)).toBe("end");
    });

    it("mirrors the corners right to left", () => {
        expect(pickOptionsPlacement(bubble, bar, [{ left: 0, right: 60, top: 80, bottom: 96 }], true)).toBe("start");
        expect(pickOptionsPlacement(bubble, bar, [{ left: 240, right: 300, top: 80, bottom: 96 }], true)).toBe("end");
    });

    it("ignores what only touches the bar's edge", () => {
        expect(pickOptionsPlacement(bubble, bar, [{ left: 0, right: 300, top: 40, bottom: 66 }], false)).toBe("end");
    });
});
