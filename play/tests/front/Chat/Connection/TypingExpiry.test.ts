import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TYPING_EXPIRY_MS, TypingExpiry } from "../../../../src/front/Chat/Connection/Proximity/TypingExpiry";

describe("TypingExpiry", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("drops a typing user whose stop never arrived", () => {
        const onExpire = vi.fn();
        new TypingExpiry(onExpire).refresh("bob");
        vi.advanceTimersByTime(TYPING_EXPIRY_MS);
        expect(onExpire).toHaveBeenCalledWith("bob");
    });

    it("keeps a user who keeps sending typing signals", () => {
        const onExpire = vi.fn();
        const expiry = new TypingExpiry(onExpire);
        expiry.refresh("bob");
        vi.advanceTimersByTime(TYPING_EXPIRY_MS - 1000);
        expiry.refresh("bob");
        vi.advanceTimersByTime(TYPING_EXPIRY_MS - 1000);
        expect(onExpire).not.toHaveBeenCalled();
    });

    it("does not expire a user who stopped, nor anyone after clear", () => {
        const onExpire = vi.fn();
        const expiry = new TypingExpiry(onExpire);
        expiry.refresh("bob");
        expiry.refresh("alice");
        expiry.forget("bob");
        expiry.clear();
        vi.advanceTimersByTime(TYPING_EXPIRY_MS);
        expect(onExpire).not.toHaveBeenCalled();
    });
});
