import { describe, expect, it } from "vitest";
import {
    buildCowebsiteOpenedProperties,
    stripUrlSensitiveParts,
    stripUrlToOrigin,
} from "../../../src/front/Administration/CowebsiteAnalyticsProperties";

/**
 * These used to be private methods on the analytics singleton, reachable only by
 * opening a cowebsite through a client that needed a socket and a capability to do
 * anything. They are pure functions over strings now, so the privacy rule they exist
 * to enforce can be stated directly.
 */
describe("cowebsite analytics properties", () => {
    it("reports the document name in fileName and nowhere else", () => {
        const properties = buildCowebsiteOpenedProperties(new URL("https://acme.tld/legal/NDA-acme-2026.pdf"), {
            targetUrl: "https://acme.tld/hr/salary-2026.xlsx",
        });

        // The whole point: one field carries the name. One field can be dropped by the
        // admin's anonymization allowlist and by the Kiosk projection — a name buried
        // in a URL cannot be dropped by anything.
        expect(properties.fileName).toBe("salary-2026.xlsx");
        expect(properties.url).toBe("https://acme.tld");
        expect(properties.targetUrl).toBe("https://acme.tld");
        expect(JSON.stringify(properties)).not.toContain("NDA-acme-2026");
        expect(JSON.stringify(properties)).not.toContain("/hr/");
    });

    it("drops the query and hash a cowebsite URL carries", () => {
        // access_token, sas, signed URLs: the query string is where credentials live.
        expect(stripUrlToOrigin("https://example.com/secured/file.pdf?token=secret#frag")).toBe("https://example.com");
    });

    it("never returns the raw string, whatever it is handed", () => {
        // The property that matters is not which branch runs, it is that no input
        // reaches the sink with its path intact.
        expect(stripUrlToOrigin("https://example.com\\bad path/doc.pdf?token=secret")).toBe("https://example.com");

        // A string that is not a URL is parsed as a path *relative to the app*, so it
        // comes back as our own origin rather than as the empty string the catch would
        // give. Worth pinning: it means garbage in is never garbage out, and the
        // unparseable branch below is rarer than it looks.
        expect(stripUrlToOrigin("not a url at all")).toBe(window.location.origin);
        expect(stripUrlToOrigin("../secret/file.pdf")).toBe(window.location.origin);
    });

    it("keeps the path of a map URL, because the path is the datum", () => {
        // The asymmetry with stripUrlToOrigin: nobody chose a map URL, and its path
        // names which map was loaded. Strip it and every map collapses onto its host.
        expect(stripUrlSensitiveParts("https://maps.example.com/team/secret-map.wam?token=abc#section")).toBe(
            "https://maps.example.com/team/secret-map.wam",
        );
    });

    it("classifies by extension, and falls back to website when there is none", () => {
        expect(buildCowebsiteOpenedProperties(new URL("https://example.com/deck.pptx"), {}).mediaKind).toBe(
            "presentation",
        );
        expect(buildCowebsiteOpenedProperties(new URL("https://example.com/workadventure"), {}).mediaKind).toBe(
            "website",
        );
    });

    it("lets the caller's context win over anything derived from the URL", () => {
        const properties = buildCowebsiteOpenedProperties(new URL("https://example.com/thing.pdf"), {
            mediaKind: "video",
            fileName: "given-by-caller",
            triggerProperty: "openLink",
            areaId: "docs-zone",
        });

        expect(properties.mediaKind).toBe("video");
        expect(properties.fileName).toBe("given-by-caller");
        expect(properties.triggerProperty).toBe("openLink");
        expect(properties.areaId).toBe("docs-zone");
    });
});
