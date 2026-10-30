import { beforeAll, describe, expect, it } from "vitest";
import { i18nObject } from "../../../../i18n/i18n-util";
import { loadLocale } from "../../../../i18n/i18n-util.sync";
import type { TranslationFunctions } from "../../../../i18n/i18n-types";
import {
    countOnlineMembers,
    formatBubbleSubtitle,
    formatDirectSubtitle,
    formatRoomSubtitle,
} from "./conversationSubtitle";

let LL: TranslationFunctions;

beforeAll(() => {
    loadLocale("en-US");
    LL = i18nObject("en-US");
});

describe("countOnlineMembers", () => {
    it("counts only the members that are connected", () => {
        expect(countOnlineMembers(["@a", "@b", "@c"], new Set(["@b", "@c", "@z"]))).toBe(2);
        expect(countOnlineMembers([], new Set(["@a"]))).toBe(0);
    });
});

describe("formatRoomSubtitle", () => {
    it("pluralizes the member count", () => {
        expect(formatRoomSubtitle(LL, 48, 12)).toBe("48 members · 12 online");
        expect(formatRoomSubtitle(LL, 1, 0)).toBe("1 member · 0 online");
    });
});

describe("formatDirectSubtitle", () => {
    it("adds the place when the person is somewhere", () => {
        expect(formatDirectSubtitle("Online", "Room B")).toBe("Online · Room B");
        expect(formatDirectSubtitle("Offline", undefined)).toBe("Offline");
    });
});

describe("formatBubbleSubtitle", () => {
    it("lists the other participants", () => {
        const participants = [
            { name: "Me", uuid: "me" },
            { name: "Théo M.", uuid: "t" },
            { name: "Inès B.", uuid: "i" },
        ];
        expect(formatBubbleSubtitle(LL, participants, "me")).toBe("With Théo M., Inès B.");
    });

    it("says nothing while alone", () => {
        expect(formatBubbleSubtitle(LL, [{ name: "Me", uuid: "me" }], "me")).toBeUndefined();
    });
});
