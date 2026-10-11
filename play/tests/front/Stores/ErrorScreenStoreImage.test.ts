import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Only the type guards are used, and only when an error is set: stubbing the module keeps this test independent of the
// generated protobuf code.
vi.mock("@workadventure/messages", () => ({
    ErrorScreenMessage: {},
    isErrorApiErrorData: { safeParse: vi.fn() },
    isErrorApiRetryData: { safeParse: vi.fn() },
    isErrorApiUnauthorizedData: { safeParse: vi.fn() },
}));

describe("importing ErrorScreenStore", () => {
    const requestedImages: string[] = [];

    beforeEach(() => {
        requestedImages.length = 0;
        vi.resetModules();
        vi.stubGlobal(
            "Image",
            class {
                set src(url: string) {
                    requestedImages.push(url);
                }
            },
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("does not download the default error image, which most visitors never see", async () => {
        await import("../../../src/front/Stores/ErrorScreenStore");

        expect(requestedImages.filter((url) => url.endsWith("error.gif"))).toEqual([]);
    });
});
