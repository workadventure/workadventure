import { describe, expect, it } from "vitest";
import { getSynchronizedCameraState } from "./MediaPublishingUtils";

describe("MediaPublishingUtils", () => {
    describe("getSynchronizedCameraState", () => {
        it("should return false when camera is not requested", () => {
            expect(getSynchronizedCameraState(false, "granted")).toBe(false);
            expect(getSynchronizedCameraState(false, "denied")).toBe(false);
            expect(getSynchronizedCameraState(false, "prompt")).toBe(false);
            expect(getSynchronizedCameraState(false, null)).toBe(false);
        });

        it("should return true when camera is requested and permission is granted", () => {
            expect(getSynchronizedCameraState(true, "granted")).toBe(true);
        });

        it("should return false when camera is requested and permission is denied or still prompt", () => {
            expect(getSynchronizedCameraState(true, "denied")).toBe(false);
            expect(getSynchronizedCameraState(true, "prompt")).toBe(false);
        });

        it("should fall back to the requested state when permission is unknown", () => {
            expect(getSynchronizedCameraState(true, null)).toBe(true);
        });
    });
});
