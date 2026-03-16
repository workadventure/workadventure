import dnsPromises from "dns/promises";
import type { LookupAddress, LookupAllOptions } from "dns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mapFetcher } from "../src/MapFetcher.ts";

vi.mock("dns/promises", () => ({
    default: {
        lookup: vi.fn(),
    },
}));

describe("MapFetcher", () => {
    beforeEach(() => {
        const lookupAllMock = vi.mocked(
            dnsPromises.lookup as (hostname: string, options: LookupAllOptions) => Promise<LookupAddress[]>
        );

        lookupAllMock.mockImplementation((hostname) => {
            switch (hostname) {
                case "127.0.0.1.nip.io":
                    return Promise.resolve([{ address: "127.0.0.1", family: 4 }]);
                case "fe80--1.sslip.io":
                    return Promise.resolve([{ address: "fe80::1", family: 6 }]);
                case "maps.workadventu.re":
                    return Promise.resolve([{ address: "51.12.42.42", family: 4 }]);
                case "2606-4700-4700--1111.sslip.io":
                    return Promise.resolve([{ address: "2606:4700:4700::1111", family: 6 }]);
                case "this.domain.name.doesnotexistfoobgjkgfdjkgldf.com":
                    return Promise.reject(Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" }));
                default:
                    return Promise.reject(new Error(`Unexpected hostname lookup in test: ${hostname}`));
            }
        });
    });

    it("should return true on localhost ending URLs", async () => {
        expect(await mapFetcher.isLocalUrl("https://localhost")).toBe(true);
        expect(await mapFetcher.isLocalUrl("https://foo.localhost")).toBe(true);
    });

    it("should return true on DNS resolving to a local domain", async () => {
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
        expect(await mapFetcher.isLocalUrl("https://maps.workadventu.re")).toBe(false);
        expect(await mapFetcher.isLocalUrl("https://2606-4700-4700--1111.sslip.io")).toBe(false);
    });

    it("should throw error on invalid domain", async () => {
        await expect(
            mapFetcher.isLocalUrl("https://this.domain.name.doesnotexistfoobgjkgfdjkgldf.com")
        ).rejects.toThrowError();
    });
});
