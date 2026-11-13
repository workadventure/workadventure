import { readFileSync } from "fs";
import { expect, test } from "vitest";
import { TRAY_ICON_PATH, TRAY_ICON_SIZE, drawStatusDot } from "./tray-icon";

const WHITE = [0xff, 0xff, 0xff, 0xff];
const TRANSPARENT = [0, 0, 0, 0];
const MEETING_RED = 0xe74c3c;
const MEETING_RED_BGRA = [0x3c, 0x4c, 0xe7, 0xff];

/** A white square standing for the cup, with the dot drawn over it. */
function whiteIconWithDot(scale: number): Buffer {
    const icon = Buffer.alloc((TRAY_ICON_SIZE * scale) ** 2 * 4, 0xff);
    drawStatusDot(icon, scale, MEETING_RED);
    return icon;
}

function pixel(icon: Buffer, scale: number, x: number, y: number): number[] {
    const offset = (y * TRAY_ICON_SIZE * scale + x) * 4;
    return [...icon.subarray(offset, offset + 4)];
}

/** Width and height from the IHDR chunk, which always comes first in a PNG. */
function pngSize(file: string): number[] {
    const png = readFileSync(file);
    return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

// The dot is drawn at fixed pixels of these two files, so a wrongly sized export would misplace it.
test("has a 16 px tray icon and its @2x", () => {
    expect(pngSize(TRAY_ICON_PATH)).toEqual([16, 16]);
    expect(pngSize(TRAY_ICON_PATH.replace(/\.png$/, "@2x.png"))).toEqual([32, 32]);
});

test("draws the dot in the bottom-right corner, with a transparent gap around it", () => {
    const icon = whiteIconWithDot(1);
    expect(pixel(icon, 1, 12, 12)).toEqual(MEETING_RED_BGRA);
    expect(pixel(icon, 1, 15, 12)).toEqual(MEETING_RED_BGRA);
    // The dot's own corner and the pixel left of the dot are cleared.
    expect(pixel(icon, 1, 10, 10)).toEqual(TRANSPARENT);
    expect(pixel(icon, 1, 9, 12)).toEqual(TRANSPARENT);
    // The rest of the cup is untouched.
    expect(pixel(icon, 1, 8, 12)).toEqual(WHITE);
    expect(pixel(icon, 1, 9, 9)).toEqual(WHITE);
});

test("scales the dot by whole pixels", () => {
    const icon = whiteIconWithDot(2);
    expect(pixel(icon, 2, 24, 24)).toEqual(MEETING_RED_BGRA);
    expect(pixel(icon, 2, 25, 25)).toEqual(MEETING_RED_BGRA);
    expect(pixel(icon, 2, 18, 25)).toEqual(TRANSPARENT);
    expect(pixel(icon, 2, 19, 25)).toEqual(TRANSPARENT);
    expect(pixel(icon, 2, 17, 25)).toEqual(WHITE);
});
