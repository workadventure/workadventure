import { get, writable } from "svelte/store";
import { describe, expect, it } from "vitest";
import { muteProximityChatNotifications, unmuteProximityChatNotifications } from "../ProximityNotificationControl";

describe("ProximityNotificationControl", () => {
    it("should mute and unmute proximity chat notifications", async () => {
        const areNotificationsMuted = writable(false);

        await muteProximityChatNotifications(areNotificationsMuted);
        expect(get(areNotificationsMuted)).toBe(true);

        await unmuteProximityChatNotifications(areNotificationsMuted);
        expect(get(areNotificationsMuted)).toBe(false);
    });
});
