import { afterEach, describe, expect, it } from "vitest";
import { isSafari } from "../../../src/front/WebRtc/DeviceUtils";

const realUserAgent = window.navigator.userAgent;

function setUserAgent(userAgent: string): void {
    Object.defineProperty(window.navigator, "userAgent", { configurable: true, value: userAgent });
}

afterEach(() => {
    setUserAgent(realUserAgent);
});

describe("isSafari", () => {
    it("detects desktop Safari", () => {
        setUserAgent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
        );

        expect(isSafari()).toBe(true);
    });

    it.each([
        [
            "Chrome",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
        ],
        [
            "Edge",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
        ],
        ["Firefox", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0"],
        [
            "Chrome on iOS",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.0.0 Mobile/15E148 Safari/604.1",
        ],
    ])("does not mistake %s for Safari", (_name, userAgent) => {
        setUserAgent(userAgent);

        expect(isSafari()).toBe(false);
    });

    it("never throws on an unrecognised user agent", () => {
        // Embedded browsers and webviews match none of Firefox / Chrome / Safari. isSafari runs at
        // module evaluation time in MediaStore, so throwing here would take the whole media
        // pipeline down instead of just disabling output selection.
        setUserAgent("SomeEmbeddedWebview/1.0");

        expect(() => isSafari()).not.toThrow();
        expect(isSafari()).toBe(false);
    });
});
