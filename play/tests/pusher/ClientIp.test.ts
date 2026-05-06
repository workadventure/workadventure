import { describe, expect, it } from "vitest";
import { getClientIpFromXForwardedFor } from "../../src/pusher/services/ClientIp";

describe("getClientIpFromXForwardedFor", () => {
    it("returns the first IP from X-Forwarded-For", () => {
        expect(getClientIpFromXForwardedFor("203.0.113.10, 10.0.0.1")).toBe("203.0.113.10");
    });

    it("returns an empty string when X-Forwarded-For is missing", () => {
        expect(getClientIpFromXForwardedFor(undefined)).toBe("");
    });
});
