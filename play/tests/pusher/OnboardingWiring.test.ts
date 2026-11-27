import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENT_CATALOG, BuiltinOnboardingAnchor } from "@workadventure/messages";
import { builtinItems } from "../../src/front/Onboarding/builtinItems";
import { referencedKeys } from "../../src/front/Onboarding/onboardingRules";
import { EMITTER_SOURCES, frontSentEventNames } from "./analyticsEmitterSources";

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

    it("only names in a built-in item's skipIfUsed the analytics events the front sends", () => {
        const sent = frontSentEventNames();
        // A scraper that silently finds nothing would pass everything.
        expect(sent.size).toBeGreaterThan(50);
        const neverSent = [...referencedKeys(builtinItems)]
            .filter((key) => Object.hasOwn(ANALYTICS_EVENT_CATALOG, key))
            .filter((name) => !sent.has(name));
        expect(neverSent, "The front never sends these events: a tip that names them would never be skipped").toEqual(
            [],
        );
    });

    it("never gives an anchor the name of an analytics event, as both share the used list", () => {
        const both = BuiltinOnboardingAnchor.options
            .map((option) => option.value)
            .filter((anchor) => Object.hasOwn(ANALYTICS_EVENT_CATALOG, anchor));
        expect(both).toEqual([]);
    });
});
