import { expect, test } from "vitest";
import { TRAY_ICON_SIZE, renderTrayIcon } from "./tray-icon";

const TRANSPARENT = [0, 0, 0, 0];
const MEETING_RED_BGRA = [0x3c, 0x4c, 0xe7, 0xff];

function pixel(icon: Buffer, scale: number, x: number, y: number): number[] {
    const offset = (y * TRAY_ICON_SIZE * scale + x) * 4;
    return [...icon.subarray(offset, offset + 4)];
}

test("draws the bare cup when online, with no status dot", () => {
    const icon = renderTrayIcon("online", 1);
    expect(icon.length).toBe(16 * 16 * 4);
    expect(pixel(icon, 1, 0, 0)).toEqual(TRANSPARENT);
    expect(pixel(icon, 1, 5, 8)).toEqual([0xff, 0xff, 0xff, 0xff]);
    // The navy keyline, where the other statuses have their dot.
    expect(pixel(icon, 1, 12, 12)).toEqual([0x4c, 0x30, 0x14, 0xff]);
});

test("puts the status color in the bottom-right corner, with a gap around it", () => {
    const icon = renderTrayIcon("meeting", 1);
    expect(pixel(icon, 1, 12, 12)).toEqual(MEETING_RED_BGRA);
    expect(pixel(icon, 1, 9, 12)).toEqual(TRANSPARENT);
});

test("scales by whole pixels", () => {
    const icon = renderTrayIcon("meeting", 2);
    expect(icon.length).toBe(32 * 32 * 4);
    expect(pixel(icon, 2, 24, 24)).toEqual(MEETING_RED_BGRA);
    expect(pixel(icon, 2, 25, 25)).toEqual(MEETING_RED_BGRA);
    expect(pixel(icon, 2, 18, 25)).toEqual(TRANSPARENT);
    expect(pixel(icon, 2, 19, 25)).toEqual(TRANSPARENT);
});
