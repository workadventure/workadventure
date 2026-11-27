import { describe, expect, it } from "vitest";
import { BuiltinOnboardingAnchor } from "@workadventure/messages";
import { EMITTER_SOURCES } from "./analyticsEmitterSources";

/**
 * World onboarding files name the anchors of the schema, so each one must be attached somewhere in the front: a
 * refactor that drops its `{@attach onboarding(...)}` fails here instead of leaving popovers that never show.
 */
describe("Onboarding wiring", () => {
    it("attaches every built-in anchor somewhere in the front", () => {
        // The built-in items name anchors without attaching them. A shortcut that marks an anchor used
        // (`anchorUsed.next("…")`) does not attach it either.
        const sources = Object.entries(EMITTER_SOURCES)
            .filter(([path]) => path.includes("/src/front/") && !path.includes("/src/front/Onboarding/"))
            .map(([, source]) => source.replace(/anchorUsed\.next\([^)]*\)/g, ""));
        const attachedNowhere = BuiltinOnboardingAnchor.options
            .map((option) => option.value)
            .filter(
                (anchor) =>
                    !sources.some((source) => ['"', "'", "`"].some((quote) => source.includes(quote + anchor + quote))),
            );
        expect(
            attachedNowhere,
            "Attach each anchor with {@attach onboarding(...)}, or remove it from BuiltinOnboardingAnchor",
        ).toEqual([]);
    });
});
