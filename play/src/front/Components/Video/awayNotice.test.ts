import { beforeAll, describe, expect, it } from "vitest";
import { AvailabilityStatus } from "@workadventure/messages";
import { i18nObject } from "../../../i18n/i18n-util";
import { loadLocale } from "../../../i18n/i18n-util.sync";
import type { TranslationFunctions } from "../../../i18n/i18n-types";
import { awayNotice } from "./awayNotice";

let LL: TranslationFunctions;

beforeAll(() => {
    loadLocale("en-US");
    LL = i18nObject("en-US");
});

describe("awayNotice", () => {
    it("says where the user is, and only the devices away mode holds", () => {
        const text = "Dan is in another window or tab";
        expect(awayNotice(LL, AvailabilityStatus.AWAY, "Dan", true, true)).toEqual({
            text,
            detail: "Camera and mic paused until they're back",
        });
        expect(awayNotice(LL, AvailabilityStatus.AWAY, "Dan", true, false)).toEqual({
            text,
            detail: "Camera paused until they're back",
        });
        expect(awayNotice(LL, AvailabilityStatus.AWAY, "Dan", false, true)).toEqual({
            text,
            detail: "Mic paused until they're back",
        });
        // Devices kept on, or turned off by the user: nothing held to explain.
        expect(awayNotice(LL, AvailabilityStatus.AWAY, "Dan", false, false)).toEqual({ text, detail: undefined });
    });

    it("says nothing once the user is back, or under a status they picked", () => {
        expect(awayNotice(LL, AvailabilityStatus.ONLINE, "Dan", false, false)).toBeUndefined();
        expect(awayNotice(LL, AvailabilityStatus.BACK_IN_A_MOMENT, "Dan", true, true)).toBeUndefined();
        expect(awayNotice(LL, undefined, "Dan", false, false)).toBeUndefined();
    });
});
