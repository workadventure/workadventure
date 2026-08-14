import path from "path";
import { describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({ PATH_PREFIX: "", USE_DOMAIN_NAME_IN_PATH: true }));
vi.mock("../../Enum/EnvironmentVariable", () => env);

const { decodeStoragePath, mapPathUsingDomain, mapPathUsingUrl } = await import("../PathMapper");

const DOMAIN = "example.map-storage.workadventu.re";

describe("decodeStoragePath", () => {
    it("decodes percent-encoded spaces", () => {
        // Storage keys are literal, URLs are percent-encoded. This is the mismatch that made every
        // map edition fail for maps stored in a directory whose name contains a space.
        expect(decodeStoragePath("/My%20maps/my-map.wam")).toBe("/My maps/my-map.wam");
    });

    it("decodes non-ASCII characters", () => {
        expect(decodeStoragePath("/Salle%20des%20f%C3%AAtes/my-map.wam")).toBe("/Salle des fêtes/my-map.wam");
    });

    it("leaves an already literal path untouched", () => {
        expect(decodeStoragePath("/My maps/my-map.wam")).toBe("/My maps/my-map.wam");
    });

    it("keeps a plus sign literal", () => {
        // "+" only means "space" in a query string, never in a path segment.
        expect(decodeStoragePath("/my+maps/my-map.wam")).toBe("/my+maps/my-map.wam");
    });

    it("keeps a segment that is not valid percent-encoding as-is", () => {
        // A literal "%" in a file name is not an escape sequence: the segment is already the key.
        expect(decodeStoragePath("/100%/my-map.wam")).toBe("/100%/my-map.wam");
        expect(decodeStoragePath("/50%off/my-map.wam")).toBe("/50%off/my-map.wam");
    });

    it("preserves the leading slash and empty segments", () => {
        expect(decodeStoragePath("/")).toBe("/");
        expect(decodeStoragePath("/my-map.wam")).toBe("/my-map.wam");
    });

    it("rejects a segment that decodes to a path separator", () => {
        expect(() => decodeStoragePath("/foo%2Fbar/my-map.wam")).toThrow("Invalid path provided");
    });

    it("rejects directory traversal, encoded or not", () => {
        expect(() => decodeStoragePath("/foo/%2E%2E/my-map.wam")).toThrow("Invalid path provided");
        expect(() => decodeStoragePath("/foo/../my-map.wam")).toThrow("Invalid path provided");
        expect(() => decodeStoragePath("/foo/%2E%2E%2F%2E%2E/my-map.wam")).toThrow("Invalid path provided");
    });
});

describe("mapPathUsingUrl", () => {
    it("builds the storage key of a map stored in a directory containing spaces", () => {
        const url = new URL(`https://${DOMAIN}/My%20maps/my-map.wam`);

        expect(mapPathUsingUrl(url)).toBe(`${DOMAIN}/My maps/my-map.wam`);
    });

    it("builds the same key as the upload path did for the same map", () => {
        // The regression: the ZIP upload writes `path.join(directory, zipEntry.path)` literally,
        // while the map edition path derives its key from a URL. Both must resolve to one key,
        // otherwise editions read (and write) an object that does not exist.
        const directory = "/My maps";
        const zipEntryPath = "my-map.wam";

        const uploadKey = mapPathUsingDomain(path.join(directory, zipEntryPath), DOMAIN);
        const editionKey = mapPathUsingUrl(new URL(`https://${DOMAIN}${directory}/${zipEntryPath}`));

        expect(editionKey).toBe(uploadKey);
    });

    it("leaves a key without special characters unchanged", () => {
        const url = new URL(`https://${DOMAIN}/my-map.wam`);

        expect(mapPathUsingUrl(url)).toBe(`${DOMAIN}/my-map.wam`);
    });

    it("strips the path prefix when one is configured", () => {
        env.PATH_PREFIX = "/prefix";
        try {
            const url = new URL(`https://${DOMAIN}/prefix/My%20maps/my-map.wam`);

            expect(mapPathUsingUrl(url)).toBe(`${DOMAIN}/My maps/my-map.wam`);
        } finally {
            env.PATH_PREFIX = "";
        }
    });

    it("omits the domain when USE_DOMAIN_NAME_IN_PATH is disabled", () => {
        env.USE_DOMAIN_NAME_IN_PATH = false;
        try {
            const url = new URL(`https://${DOMAIN}/My%20maps/my-map.wam`);

            expect(mapPathUsingUrl(url)).toBe("My maps/my-map.wam");
        } finally {
            env.USE_DOMAIN_NAME_IN_PATH = true;
        }
    });
});
