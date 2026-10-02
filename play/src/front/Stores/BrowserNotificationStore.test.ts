import { get } from "svelte/store";
import { afterEach, describe, expect, it, vi } from "vitest";
import { localUserStore } from "../Connection/LocalUserStore";
import { createBrowserNotificationStore } from "./BrowserNotificationStore";

describe("BrowserNotificationStore", () => {
    const originalNotification = globalThis.Notification;

    afterEach(() => {
        vi.restoreAllMocks();
        Object.defineProperty(globalThis, "Notification", {
            configurable: true,
            value: originalNotification,
        });
    });

    it("is enabled when browser permission and user preference are enabled", () => {
        vi.spyOn(localUserStore, "getNotification").mockReturnValue(true);
        Object.defineProperty(globalThis, "Notification", {
            configurable: true,
            value: {
                permission: "granted",
            },
        });

        const store = createBrowserNotificationStore();

        expect(get(store)).toBe(true);
    });

    it("is disabled when browser permission is not granted", () => {
        vi.spyOn(localUserStore, "getNotification").mockReturnValue(true);
        Object.defineProperty(globalThis, "Notification", {
            configurable: true,
            value: {
                permission: "denied",
            },
        });

        const store = createBrowserNotificationStore();

        expect(get(store)).toBe(false);
    });

    it("is disabled when user preference is disabled", () => {
        vi.spyOn(localUserStore, "getNotification").mockReturnValue(false);
        Object.defineProperty(globalThis, "Notification", {
            configurable: true,
            value: {
                permission: "granted",
            },
        });

        const store = createBrowserNotificationStore();

        expect(get(store)).toBe(false);
    });

    it("refreshes when browser notification state changes", () => {
        vi.spyOn(localUserStore, "getNotification").mockReturnValue(true);
        const notification = {
            permission: "denied",
        };
        Object.defineProperty(globalThis, "Notification", {
            configurable: true,
            value: notification,
        });
        const store = createBrowserNotificationStore();

        expect(get(store)).toBe(false);

        notification.permission = "granted";
        store.refresh();

        expect(get(store)).toBe(true);
    });
});
