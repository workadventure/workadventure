import { describe, expect, it } from "vitest";
import {
    BuiltinOnboardingAnchor,
    BuiltinTourId,
    OnboardingAnchorArea,
    parseOnboardingData,
} from "@workadventure/messages";
import { builtinItems } from "./builtinItems";
import type { OnboardingItem } from "./onboardingRules";
import { mergeItems, pickText } from "./worldOnboarding";

/** The example of DESIGN_onboarding.md. */
const example = {
    version: 1,
    quietPeriodMinutes: 120,
    builtin: { announcements: false, disabledTours: ["wa.mapEditor.furniture"] },
    items: [
        {
            id: "acme-place-furniture",
            kind: "tour",
            audience: { tags: ["admin", "editor"] },
            when: { minDaysSinceFirstVisit: 1 },
            steps: [
                { type: "popover", anchor: "actionBar.mapMenu", advance: "click", text: { "en-US": "Open the menu." } },
                {
                    type: "popover",
                    anchor: "mapEditor.entityList",
                    title: { "en-US": "Place furniture" },
                    text: { "en-US": "Drag any object onto the map." },
                },
            ],
        },
        {
            id: "acme-new-auditorium",
            kind: "announcement",
            when: { expiresAt: "2027-01-15", after: { item: "acme-place-furniture", minHours: 24 } },
            steps: [
                { type: "modal", text: "Town halls now happen on the second floor.", image: "https://e.com/a.webp" },
            ],
        },
    ],
};

const modal = (id: string, extra: object = {}) => ({
    id,
    kind: "announcement",
    steps: [{ type: "modal", text: id }],
    ...extra,
});

describe("parseOnboardingData", () => {
    it("reads the example of the design", () => {
        const { data, errors } = parseOnboardingData(example);
        expect(errors).toEqual([]);
        expect(data?.quietPeriodMinutes).toBe(120);
        expect(data?.items.map((item) => item.id)).toEqual(["acme-place-furniture", "acme-new-auditorium"]);
    });

    it("leaves out each broken item and says why, and keeps the others", () => {
        const { data, errors } = parseOnboardingData({
            version: 1,
            items: [
                modal("ok"),
                // An anchor that does not exist, an id of the built-in items, a typo, a repeated id.
                { id: "bad-anchor", kind: "tour", steps: [{ type: "popover", anchor: "actionBar.nope", text: "" }] },
                modal("wa.mine"),
                modal("typo", { audiense: { tags: ["admin"] } }),
                modal("ok"),
                // A button that a map script adds is a valid anchor.
                {
                    id: "custom",
                    kind: "tour",
                    steps: [{ type: "popover", anchor: "actionBar.custom.register", text: "" }],
                },
            ],
        });
        expect(data?.items.map((item) => item.id)).toEqual(["ok", "custom"]);
        expect(errors).toHaveLength(4);
        expect(errors[0]).toMatch(/^items\.1 \("bad-anchor"\) is ignored: steps\.0\.anchor/);
        expect(errors[1]).toContain("World item ids cannot start with wa.");
        expect(errors[2]).toContain("audiense");
        expect(errors[3]).toBe('items.4 ("ok") is ignored: an earlier item has the same id');
    });

    it("ignores a built-in tour it does not know, and defaults the quiet period", () => {
        const { data, errors } = parseOnboardingData({
            version: 1,
            builtin: { disabledTours: ["wa.tip.lockBubble", "wa.removedTour"] },
        });
        expect(data?.builtin?.disabledTours).toEqual(["wa.tip.lockBubble"]);
        expect(data?.quietPeriodMinutes).toBe(60);
        expect(data?.items).toEqual([]);
        expect(errors).toEqual(['builtin.disabledTours: "wa.removedTour" is not a built-in tour']);
    });

    it("keeps nothing when the root is wrong", () => {
        expect(parseOnboardingData({ version: 2, items: [modal("a")] }).data).toBeUndefined();
        expect(parseOnboardingData({ version: 1, quietPeriodMinutes: -1 }).data).toBeUndefined();
        expect(parseOnboardingData("nope").errors).toHaveLength(1);
    });

    it("lists every built-in tour a world can turn off", () => {
        const tours = builtinItems.filter((item) => item.kind === "tour").map((item) => item.id);
        expect(tours.sort()).toEqual(BuiltinTourId.options.map((option) => option.value).sort());
    });

    it("gives every built-in anchor an area", () => {
        const areas = OnboardingAnchorArea.options.map((option) => option.value);
        for (const { value } of BuiltinOnboardingAnchor.options) {
            expect(areas, value).toContain(value.split(".")[0]);
        }
    });
});

describe("pickText", () => {
    const text = { "fr-CA": "québécois", "de-DE": "deutsch", "en-US": "english" };

    it("takes the locale, then the language, then English, then the first text", () => {
        expect(pickText(text, "de-DE")).toBe("deutsch");
        expect(pickText(text, "fr-FR")).toBe("québécois");
        expect(pickText(text, "ja-JP")).toBe("english");
        expect(pickText({ "de-DE": "deutsch", "fr-FR": "français" }, "ja-JP")).toBe("deutsch");
        expect(pickText("for everyone", "ja-JP")).toBe("for everyone");
    });
});

describe("mergeItems", () => {
    const builtin: OnboardingItem[] = [
        { id: "wa.tutorial", kind: "tutorial", title: () => "", steps: [] },
        { id: "wa.announcement.v1", kind: "announcement", title: () => "", steps: [] },
        { id: "wa.mapEditor.furniture", kind: "tour", title: () => "", steps: [] },
        { id: "wa.tip.lockBubble", kind: "tour", title: () => "", steps: [] },
    ];
    const ids = (items: OnboardingItem[]) => items.map((item) => item.id);

    it("puts the world's items first, and keeps the built-in content the world did not turn off", () => {
        const { data } = parseOnboardingData(example);
        const items = mergeItems(builtin, data);
        expect(ids(items)).toEqual(["acme-place-furniture", "acme-new-auditorium", "wa.tutorial", "wa.tip.lockBubble"]);
        // Without a title of its own, an item is named after the first title of its steps.
        expect(items[0].title()).toBe("Place furniture");
        expect(items[1].title()).toBe("acme-new-auditorium");
        expect(items[0].steps[0]).toMatchObject({ type: "popover", anchor: "actionBar.mapMenu", advance: "click" });
        expect(items[1].steps[0].type === "modal" && items[1].steps[0].text()).toBe(
            "Town halls now happen on the second floor.",
        );
    });

    it("keeps every built-in item without a world config", () => {
        expect(ids(mergeItems(builtin, undefined))).toEqual(ids(builtin));
    });
});
