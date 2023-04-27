import { describe, expect, it } from "vitest";
import { mapFetcher } from "@workadventure/map-editor/src/MapFetcher";

// TODO: move this test to libs/map-editor
describe("MapFetcher", () => {
    it("should return true on localhost ending URLs", async () => {
        expect(await mapFetcher.isLocalUrl("https://localhost")).toBe(true);
        expect(await mapFetcher.isLocalUrl("https://foo.localhost")).toBe(true);
    });

    it("should return true on DNS resolving to a local domain", async () => {
        expect(await mapFetcher.isLocalUrl("https://127.0.0.1.nip.io")).toBe(true);
    });

    it("should return true on an IP resolving to a local domain", async () => {
        expect(await mapFetcher.isLocalUrl("https://127.0.0.1")).toBe(true);
        expect(await mapFetcher.isLocalUrl("https://192.168.0.1")).toBe(true);
    });

    it("should return false on an IP resolving to a global domain", async () => {
        expect(await mapFetcher.isLocalUrl("https://51.12.42.42")).toBe(false);
    });

    it("should return false on an DNS resolving to a global domain", async () => {
        expect(await mapFetcher.isLocalUrl("https://maps.workadventu.re")).toBe(false);
    });

    it("should throw error on invalid domain", async () => {
        await expect(
            mapFetcher.isLocalUrl("https://this.domain.name.doesnotexistfoobgjkgfdjkgldf.com")
        ).rejects.toThrowError();
    });
});
