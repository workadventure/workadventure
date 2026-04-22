import type { LookupAddress, LookupAllOptions } from "dns";
import dnsPromises from "dns/promises";
import type { MockInstance } from "vitest";

import { afterEach, describe, expect, it, vi } from "vitest";
import { mapFetcher } from "../src/MapFetcher";

type LookupWithAll = (hostname: string, options: LookupAllOptions) => Promise<LookupAddress[]>;

const mockLookup = (): MockInstance<Parameters<LookupWithAll>, ReturnType<LookupWithAll>> =>
    vi.spyOn(dnsPromises, "lookup") as unknown as MockInstance<Parameters<LookupWithAll>, ReturnType<LookupWithAll>>;

describe("MapFetcher", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should return true on localhost ending URLs", async () => {
        expect(await mapFetcher.isLocalUrl("https://localhost")).toBe(true);
        expect(await mapFetcher.isLocalUrl("https://foo.localhost")).toBe(true);
    });

    it("should return true on DNS resolving to a local domain", async () => {
        mockLookup()
            .mockResolvedValueOnce([{ address: "127.0.0.1", family: 4 }])
            .mockResolvedValueOnce([{ address: "fe80::1", family: 6 }]);

        expect(await mapFetcher.isLocalUrl("https://127.0.0.1.nip.io")).toBe(true);
        expect(await mapFetcher.isLocalUrl("https://fe80--1.sslip.io")).toBe(true);
    });

    it("should return true on an IP resolving to a local domain", async () => {
        expect(await mapFetcher.isLocalUrl("https://127.0.0.1")).toBe(true);
        expect(await mapFetcher.isLocalUrl("https://192.168.0.1")).toBe(true);
        expect(await mapFetcher.isLocalUrl("https://[fd01::1]")).toBe(true);
    });

    it("should return false on an IP resolving to a global domain", async () => {
        expect(await mapFetcher.isLocalUrl("https://51.12.42.42")).toBe(false);
        expect(await mapFetcher.isLocalUrl("https://[2606:4700:4700::1111]")).toBe(false);
    });

    it("should return false on an DNS resolving to a global domain", async () => {
        mockLookup()
            .mockResolvedValueOnce([{ address: "51.12.42.42", family: 4 }])
            .mockResolvedValueOnce([{ address: "2606:4700:4700::1111", family: 6 }]);

        expect(await mapFetcher.isLocalUrl("https://maps.workadventu.re")).toBe(false);
        expect(await mapFetcher.isLocalUrl("https://2606-4700-4700--1111.sslip.io")).toBe(false);
    });

    it("should throw error on invalid domain", async () => {
        vi.spyOn(dnsPromises, "lookup").mockRejectedValueOnce(new Error("ENOTFOUND"));

        await expect(
            mapFetcher.isLocalUrl("https://this.domain.name.doesnotexistfoobgjkgfdjkgldf.com")
        ).rejects.toThrowError();
    });
});
