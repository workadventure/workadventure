import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { get, writable } from "svelte/store";
import type { RaisedHandSection, SpaceInterface } from "../../../src/front/Space/SpaceInterface";
import {
    ANNOUNCEMENT_LIFETIME_MS,
    DUPLICATE_WINDOW_MS,
    announce,
    liveAnnouncementsStore,
    watchRaisedHands,
} from "../../../src/front/Stores/LiveAnnouncerStore";
import { loadLocaleAsync } from "../../../src/i18n/i18n-util.async";
import { setLocale } from "../../../src/i18n/i18n-svelte";

const messages = () => get(liveAnnouncementsStore).map(({ message, politeness }) => `${politeness}:${message}`);

describe("announce", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        // Lets every pending announcement expire, so no test sees the previous one's.
        vi.advanceTimersByTime(ANNOUNCEMENT_LIFETIME_MS);
        vi.useRealTimers();
    });

    it("adds the message to the region of its politeness, polite by default", () => {
        announce("Bob joined the discussion");
        announce("Connection lost", "assertive");
        expect(messages()).toEqual(["polite:Bob joined the discussion", "assertive:Connection lost"]);
    });

    it("ignores blank messages and collapses whitespace", () => {
        announce("   \n ");
        announce("  Bob \n  raised   their hand ");
        expect(messages()).toEqual(["polite:Bob raised their hand"]);
    });

    it("drops the same message repeated within the duplicate window, not after it", () => {
        announce("Bob joined the discussion");
        announce("Bob joined the discussion");
        announce("Bob joined the discussion", "assertive");
        expect(messages()).toEqual(["polite:Bob joined the discussion", "assertive:Bob joined the discussion"]);

        vi.advanceTimersByTime(DUPLICATE_WINDOW_MS);
        announce("Bob joined the discussion");
        expect(messages()).toHaveLength(3);
    });

    it("removes each message once read", () => {
        announce("First");
        vi.advanceTimersByTime(ANNOUNCEMENT_LIFETIME_MS / 2);
        announce("Second");
        vi.advanceTimersByTime(ANNOUNCEMENT_LIFETIME_MS / 2);
        expect(messages()).toEqual(["polite:Second"]);
        vi.advanceTimersByTime(ANNOUNCEMENT_LIFETIME_MS / 2);
        expect(messages()).toEqual([]);
    });
});

describe("watchRaisedHands", () => {
    beforeAll(async () => {
        await loadLocaleAsync("en-US");
        setLocale("en-US");
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("announces a hand raised by someone else, not the hands already up nor mine", () => {
        vi.useFakeTimers();
        const space = { getName: () => "bubble", mySpaceUserId: "me" } as unknown as SpaceInterface;
        const section = (...names: string[]) =>
            ({
                space,
                hands: names.map((name, at) => ({ spaceUserId: name, name, at })),
                speakers: [],
            }) as unknown as RaisedHandSection;
        const sections = writable([section("Eve")]);
        const unsubscribe = watchRaisedHands(sections);

        sections.set([section("Eve", "me")]);
        sections.set([section("Eve", "me", "Bob")]);
        unsubscribe();

        expect(messages()).toHaveLength(1);
        expect(messages()[0]).toContain("Bob");
        vi.advanceTimersByTime(ANNOUNCEMENT_LIFETIME_MS);
    });
});
