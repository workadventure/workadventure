import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { get, type Writable } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";

const stores: Record<string, Writable<unknown>> = vi.hoisted(() => ({}));

vi.mock("../Stores/MediaStore", async () => {
    const { writable } = await import("svelte/store");
    stores.requested = writable(null);
    return { requestedStatusStore: stores.requested };
});
vi.mock("../Stores/StreamableCollectionStore", async () => {
    const { writable } = await import("svelte/store");
    stores.conversation = writable(false);
    return { isInActiveConversationStore: stores.conversation };
});
vi.mock("../Stores/FocusStore", async () => {
    const { writable } = await import("svelte/store");
    stores.focus = writable(false);
    return { focusStore: stores.focus };
});
vi.mock("../Stores/GameSceneStore", async () => {
    const { writable } = await import("svelte/store");
    stores.mapLoaded = writable(false);
    return { gameSceneIsLoadedStore: stores.mapLoaded };
});
vi.mock("../Stores/PrivacyShutdownStore", async () => {
    const { writable } = await import("svelte/store");
    stores.away = writable(false);
    return { privacyShutdownStore: stores.away };
});

import { idleStore } from "../Stores/IdleStore";
import { AWAY_BEFORE_IDLE_MS, goIdle, startIdleRules } from "./IdleRules";

const MINUTE = 60_000;

describe("goIdle", () => {
    beforeEach(() => {
        idleStore.set(false);
        stores.requested.set(null);
        stores.conversation.set(false);
    });

    it("makes an online or away user idle", () => {
        goIdle();
        expect(get(idleStore)).toBe(true);
    });

    it("leaves a status the user picked alone", () => {
        stores.requested.set(AvailabilityStatus.DO_NOT_DISTURB);
        goIdle();
        expect(get(idleStore)).toBe(false);
    });

    it("never starts with someone: a user following a meeting without touching anything is not idle", () => {
        stores.conversation.set(true);
        goIdle();
        expect(get(idleStore)).toBe(false);
    });
});

describe("startIdleRules", () => {
    let stop: () => void;

    beforeEach(() => {
        vi.useFakeTimers();
        idleStore.set(false);
        stores.requested.set(null);
        stores.conversation.set(false);
        stores.focus.set(false);
        stores.away.set(false);
        stores.mapLoaded.set(false);
        stop = startIdleRules();
    });

    afterEach(() => {
        stop();
        vi.useRealTimers();
    });

    it("a page that never had the focus goes idle when its first map is loaded", () => {
        stores.mapLoaded.set(true);
        expect(get(idleStore)).toBe(true);
    });

    it("a page that had the focus does not, even if it lost it before the map was loaded", () => {
        stores.focus.set(true);
        stores.focus.set(false);
        stores.mapLoaded.set(true);
        expect(get(idleStore)).toBe(false);
    });

    it("only the first map counts: a later one is not a new page", () => {
        stores.mapLoaded.set(true);
        // Back from the mini window, without ever giving the page the focus.
        idleStore.set(false);
        stores.mapLoaded.set(false);
        stores.mapLoaded.set(true);
        expect(get(idleStore)).toBe(false);
    });

    it("coming back to WorkAdventure ends idle", () => {
        idleStore.set(true);
        stores.focus.set(true);
        expect(get(idleStore)).toBe(false);
    });

    it("3 hours in away mode make the user idle", () => {
        stores.away.set(true);
        vi.advanceTimersByTime(AWAY_BEFORE_IDLE_MS - MINUTE);
        expect(get(idleStore)).toBe(false);
        vi.advanceTimersByTime(MINUTE);
        expect(get(idleStore)).toBe(true);
    });

    it("counts the time the computer slept, which page timers may not", () => {
        stores.away.set(true);
        vi.setSystemTime(Date.now() + AWAY_BEFORE_IDLE_MS + 8 * 60 * MINUTE);
        vi.advanceTimersByTime(MINUTE);
        expect(get(idleStore)).toBe(true);
    });

    it("coming back from away mode starts the count again", () => {
        stores.away.set(true);
        vi.advanceTimersByTime(AWAY_BEFORE_IDLE_MS - 10 * MINUTE);
        stores.away.set(false);
        stores.away.set(true);
        vi.advanceTimersByTime(10 * MINUTE);
        expect(get(idleStore)).toBe(false);
    });

    it("waits for the conversation to end before going idle", () => {
        stores.away.set(true);
        stores.conversation.set(true);
        vi.advanceTimersByTime(AWAY_BEFORE_IDLE_MS + MINUTE);
        expect(get(idleStore)).toBe(false);
        stores.conversation.set(false);
        vi.advanceTimersByTime(MINUTE);
        expect(get(idleStore)).toBe(true);
    });
});
