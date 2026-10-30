import { afterEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import { errorScreenStore } from "../../../src/front/Stores/ErrorScreenStore";

describe("errorScreenStore.setException", () => {
    afterEach(() => {
        errorScreenStore.delete();
        vi.restoreAllMocks();
    });

    it("shows an error screen for something that is not an Error, instead of rethrowing it", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});

        expect(() => errorScreenStore.setException(new Event("close"))).not.toThrow();

        expect(get(errorScreenStore)).toMatchObject({
            type: "error",
            code: "INTERNAL_ERROR",
            title: "An error occurred",
            details: "[object Event]",
        });
    });
});
