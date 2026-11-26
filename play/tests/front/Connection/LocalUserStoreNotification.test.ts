// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import type { WorkAdventureDesktopApi } from "@workadventure/desktop-api";
import { localUserStore } from "../../../src/front/Connection/LocalUserStore";

const KEY = "notificationPermission";

function inDesktopApp(): void {
    window.WAD = mock<WorkAdventureDesktopApi>({ desktop: true, notifyMessage: vi.fn() });
}

describe("notification setting", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        delete window.WAD;
    });

    it("is on by default in a desktop app that can notify", () => {
        inDesktopApp();
        expect(localUserStore.getNotification()).toBe(true);
    });

    it("is on by default with an older desktop app that only has notify()", () => {
        window.WAD = mock<WorkAdventureDesktopApi>({ desktop: true, notifyMessage: undefined, notify: vi.fn() });
        expect(localUserStore.getNotification()).toBe(true);
    });

    it("is off by default when the desktop API cannot notify", () => {
        // A deep mock answers every property with a function: the two methods must be removed explicitly.
        window.WAD = mock<WorkAdventureDesktopApi>({ desktop: true, notifyMessage: undefined, notify: undefined });
        expect(localUserStore.getNotification()).toBe(false);
    });

    it("is off by default on the web", () => {
        expect(localUserStore.getNotification()).toBe(false);
    });

    it("keeps an explicit choice over the default", () => {
        inDesktopApp();
        localUserStore.setNotification(false);
        expect(localUserStore.getNotification()).toBe(false);

        delete window.WAD;
        localUserStore.setNotification(true);
        expect(localUserStore.getNotification()).toBe(true);
    });

    it("does not write the default", () => {
        inDesktopApp();
        localUserStore.getNotification();
        expect(localStorage.getItem(KEY)).toBeNull();
    });
});
