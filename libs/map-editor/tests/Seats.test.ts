import { describe, expect, it } from "vitest";
import { getSeatPositions, SeatPropertyData } from "../src";

describe("getSeatPositions", () => {
    it("puts a single chair's seat at its center, lifted onto the seat", () => {
        expect(getSeatPositions({ x: 64, y: 96, width: 32, height: 32 }, { direction: "down", seats: 1 })).toEqual([
            { x: 80, y: 106, direction: "down", inFront: true },
        ]);
    });

    it("seats the player behind a chair facing up, higher so the head shows", () => {
        const [seat] = getSeatPositions({ x: 0, y: 0, width: 32, height: 32 }, { direction: "up", seats: 1 });
        expect(seat).toEqual({ x: 16, y: 6, direction: "up", inFront: false });
    });

    it("uses the bottom row of a tall armchair, under its backrest", () => {
        const [seat] = getSeatPositions({ x: 0, y: 0, width: 32, height: 64 }, { direction: "down", seats: 1 });
        expect(seat).toMatchObject({ x: 16, y: 42 });
    });

    it("spreads the places of a couch facing down along its width", () => {
        const seats = getSeatPositions({ x: 0, y: 0, width: 64, height: 64 }, { direction: "down", seats: 2 });
        expect(seats.map(({ x, y }) => ({ x, y }))).toEqual([
            { x: 16, y: 42 },
            { x: 48, y: 42 },
        ]);
    });

    it("stacks the places of a couch facing left upwards from the bottom row", () => {
        const seats = getSeatPositions({ x: 0, y: 0, width: 32, height: 64 }, { direction: "left", seats: 2 });
        expect(seats.map(({ x, y }) => ({ x, y }))).toEqual([
            { x: 16, y: 10 },
            { x: 16, y: 42 },
        ]);
    });

    it("never stacks places above the object", () => {
        const seats = getSeatPositions({ x: 0, y: 0, width: 32, height: 32 }, { direction: "right", seats: 3 });
        expect(seats.every(({ y }) => y >= 16 - 6)).toBe(true);
    });

    it("accepts a property parsed with its defaults", () => {
        const property = SeatPropertyData.parse({ id: "seat", type: "seat" });
        expect(getSeatPositions({ x: 0, y: 0, width: 32, height: 32 }, property)).toHaveLength(1);
    });
});
