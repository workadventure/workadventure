import { beforeAll, describe, expect, it } from "vitest";
import { i18nObject } from "../../../../i18n/i18n-util";
import { loadLocale } from "../../../../i18n/i18n-util.sync";
import { reactionTooltipText } from "./reactionTooltipText";

describe("reactionTooltipText", () => {
    beforeAll(() => {
        loadLocale("en-US");
        loadLocale("fr-FR");
    });

    const en = () => i18nObject("en-US");
    const fr = () => i18nObject("fr-FR");

    it("talks to the user when they are the only one who reacted", () => {
        expect(reactionTooltipText(fr(), "fr-FR", "👍", [], true)).toBe("Vous avez réagi avec 👍");
    });

    it("uses the singular for a single other user", () => {
        expect(reactionTooltipText(fr(), "fr-FR", "👍", ["Camille L."], false)).toBe("Camille L. a réagi avec 👍");
    });

    it("puts the user first and joins the names with the locale's conjunction", () => {
        expect(reactionTooltipText(fr(), "fr-FR", "👍", ["Camille L.", "Théo M."], true)).toBe(
            "Vous, Camille L. et Théo M. ont réagi avec 👍",
        );
        expect(reactionTooltipText(en(), "en-US", "🎉", ["Camille L.", "Théo M."], false)).toBe(
            "Camille L. and Théo M. reacted with 🎉",
        );
    });

    it("shows 5 names at most, then counts the others", () => {
        const others = ["Camille L.", "Théo M.", "Inès B.", "Hugo P.", "Léa R.", "Noé S.", "Zoé T."];
        expect(reactionTooltipText(fr(), "fr-FR", "👍", others, true)).toBe(
            "Vous, Camille L., Théo M., Inès B., Hugo P. et 3 autres ont réagi avec 👍",
        );
        expect(reactionTooltipText(en(), "en-US", "👍", others.slice(0, 6), false)).toBe(
            "Camille L., Théo M., Inès B., Hugo P., Léa R., and 1 other reacted with 👍",
        );
    });
});
