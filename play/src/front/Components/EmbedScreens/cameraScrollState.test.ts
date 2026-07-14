import { describe, expect, it } from "vitest";
import { computeCameraScrollState } from "./cameraScrollState";

describe("computeCameraScrollState", () => {
    it("start-aligns horizontal one-line cameras as soon as they overflow", () => {
        expect(
            computeCameraScrollState(
                {
                    scrollLeft: 0,
                    scrollTop: 0,
                    scrollWidth: 2_000,
                    scrollHeight: 180,
                    clientWidth: 900,
                    clientHeight: 180,
                },
                true,
                "horizontal",
            ),
        ).toEqual({
            canScrollLeft: false,
            canScrollRight: true,
            canScrollTop: false,
            canScrollBottom: false,
            shouldStartAlign: true,
        });
    });

    it("keeps horizontal one-line cameras centered when there is no overflow", () => {
        expect(
            computeCameraScrollState(
                {
                    scrollLeft: 0,
                    scrollTop: 0,
                    scrollWidth: 900,
                    scrollHeight: 180,
                    clientWidth: 900,
                    clientHeight: 180,
                },
                true,
                "horizontal",
            ).shouldStartAlign,
        ).toBe(false);
    });

    it("uses vertical indicators outside horizontal one-line mode", () => {
        expect(
            computeCameraScrollState(
                {
                    scrollLeft: 0,
                    scrollTop: 12,
                    scrollWidth: 900,
                    scrollHeight: 1_200,
                    clientWidth: 900,
                    clientHeight: 500,
                },
                false,
                "horizontal",
            ),
        ).toEqual({
            canScrollLeft: false,
            canScrollRight: false,
            canScrollTop: true,
            canScrollBottom: true,
            shouldStartAlign: false,
        });
    });
});
