import { describe, expect, it } from "vitest";
import { validateLinkForApplication } from "../../src/Application/MediaLink";

describe("validateLinkForApplication for Excalidraw", () => {
    it("accepts excalidraw.com without any configured domain", () => {
        expect(() =>
            validateLinkForApplication(new URL("https://excalidraw.com/#room=a,b"), "Excalidraw"),
        ).not.toThrow();
    });

    it("accepts a self-hosted domain listed in EXCALIDRAW_DOMAINS", () => {
        expect(() =>
            validateLinkForApplication(new URL("https://draw.example.org/"), "Excalidraw", {
                excalidrawDomains: ["draw.example.org"],
            }),
        ).not.toThrow();
    });

    it("rejects a domain that is not listed", () => {
        expect(() => validateLinkForApplication(new URL("https://draw.example.org/"), "Excalidraw")).toThrow();
    });
});
