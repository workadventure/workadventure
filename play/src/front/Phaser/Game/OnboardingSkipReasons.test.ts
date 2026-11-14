import { describe, expect, it } from "vitest";
import { onboardingSkipReasons, settledBy } from "./OnboardingSkipReasons";

describe("settledBy", () => {
    it("tells a known value from one the world filled in", () => {
        expect(settledBy(true, true, "random")).toBe("known");
        expect(settledBy(false, true, "random")).toBe("random");
        expect(settledBy(false, true, "fix-plus-random-numbers")).toBe("imposed");
        // "fix" without a default name leaves the name unset: the screen asks for it.
        expect(settledBy(false, false, "fix")).toBeUndefined();
    });
});

describe("onboardingSkipReasons", () => {
    it("gives no reason for a new player who sees every screen", () => {
        expect(onboardingSkipReasons("name", { name: undefined, woka: undefined }, false)).toEqual({});
    });

    it("skips the Woka screen after the name when the world imposes one", () => {
        expect(onboardingSkipReasons("name", { name: undefined, woka: "imposed" }, false)).toEqual({
            wokaSkipReason: "woka_imposed",
        });
    });

    it("says why everything was skipped for a returning player", () => {
        expect(onboardingSkipReasons("room", { name: "known", woka: "known" }, false)).toEqual({
            nameSkipReason: "name_known",
            wokaSkipReason: "woka_known",
            cameraSkipReason: "camera_already_configured",
        });
    });

    it("puts the world's camera setting ahead of any other reason", () => {
        expect(onboardingSkipReasons("room", { name: "random", woka: "random" }, true)).toEqual({
            nameSkipReason: "name_random",
            wokaSkipReason: "woka_random",
            cameraSkipReason: "camera_skipped_by_world",
        });
        expect(onboardingSkipReasons("name", { name: undefined, woka: undefined }, true)).toEqual({
            cameraSkipReason: "camera_skipped_by_world",
        });
    });

    it("blames the install prompt for the screens it jumps over", () => {
        expect(onboardingSkipReasons("pwa_install", { name: "imposed", woka: undefined }, false)).toEqual({
            nameSkipReason: "name_imposed",
            wokaSkipReason: "pwa_install",
            cameraSkipReason: "pwa_install",
        });
    });

    it("counts a Woka the server knows as known", () => {
        expect(onboardingSkipReasons("camera", { name: "known", woka: undefined }, false)).toEqual({
            nameSkipReason: "name_known",
            wokaSkipReason: "woka_known",
        });
    });
});
