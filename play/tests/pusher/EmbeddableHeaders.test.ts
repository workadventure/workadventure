import { describe, expect, it } from "vitest";

import { isFrameable } from "../../src/pusher/services/EmbeddableHeaders";

const OWN = "https://play.workadventure.localhost";

describe("isFrameable", () => {
    it("should allow a site that sends no framing header", () => {
        expect(isFrameable({}, OWN)).toBe(true);
    });

    it("should refuse X-Frame-Options deny and sameorigin, case-insensitively", () => {
        expect(isFrameable({ "x-frame-options": "DENY" }, OWN)).toBe(false);
        expect(isFrameable({ "x-frame-options": "SameOrigin" }, OWN)).toBe(false);
    });

    it("should refuse a CSP frame-ancestors that does not name us (claude.ai regression)", () => {
        const headers = {
            "content-security-policy":
                "frame-ancestors 'self' chrome-extension://abc; frame-src https://x.frame.claudeusercontent.com; script-src 'self'",
        };

        expect(isFrameable(headers, OWN)).toBe(false);
    });

    it("should refuse frame-ancestors 'none'", () => {
        expect(isFrameable({ "content-security-policy": "frame-ancestors 'none'" }, OWN)).toBe(false);
    });

    it("should allow frame-ancestors that opens to everyone", () => {
        expect(isFrameable({ "content-security-policy": "default-src 'self'; frame-ancestors *" }, OWN)).toBe(true);
        expect(isFrameable({ "content-security-policy": "frame-ancestors https:" }, OWN)).toBe(true);
    });

    it("should allow frame-ancestors that names our host, exactly or by wildcard", () => {
        expect(
            isFrameable(
                { "content-security-policy": "frame-ancestors 'self' https://play.workadventure.localhost" },
                OWN,
            ),
        ).toBe(true);
        expect(isFrameable({ "content-security-policy": "frame-ancestors *.workadventure.localhost" }, OWN)).toBe(true);
        expect(isFrameable({ "content-security-policy": "frame-ancestors https://other.example" }, OWN)).toBe(false);
    });

    it("should let CSP override a permissive X-Frame-Options", () => {
        const headers = { "x-frame-options": "ALLOWALL", "content-security-policy": "frame-ancestors 'self'" };

        expect(isFrameable(headers, OWN)).toBe(false);
    });
});
