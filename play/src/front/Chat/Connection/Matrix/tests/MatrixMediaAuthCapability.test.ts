import type { MatrixClient } from "matrix-js-sdk";
import { describe, expect, it, vi } from "vitest";
import { isSpecVersionAtLeastV1_11, serverSupportsAuthenticatedMedia } from "../MatrixMediaAuthCapability";

function clientWithVersions(getVersions: MatrixClient["getVersions"]): MatrixClient {
    return { getVersions } as unknown as MatrixClient;
}

describe("isSpecVersionAtLeastV1_11", () => {
    it("accepts v1.11 and later", () => {
        expect(isSpecVersionAtLeastV1_11("v1.11")).toBe(true);
        expect(isSpecVersionAtLeastV1_11("v1.12")).toBe(true);
        expect(isSpecVersionAtLeastV1_11("v1.20")).toBe(true);
        expect(isSpecVersionAtLeastV1_11("v2.0")).toBe(true);
    });

    it("rejects earlier or non-v1 spec versions", () => {
        expect(isSpecVersionAtLeastV1_11("v1.10")).toBe(false);
        expect(isSpecVersionAtLeastV1_11("v1.9")).toBe(false);
        expect(isSpecVersionAtLeastV1_11("v1.1")).toBe(false);
        expect(isSpecVersionAtLeastV1_11("r0.6.1")).toBe(false);
        expect(isSpecVersionAtLeastV1_11("nonsense")).toBe(false);
    });
});

describe("serverSupportsAuthenticatedMedia", () => {
    it("returns true when the server advertises spec v1.11", async () => {
        const client = clientWithVersions(
            vi.fn(() => Promise.resolve({ versions: ["v1.6", "v1.11"], unstable_features: {} })),
        );
        await expect(serverSupportsAuthenticatedMedia(client)).resolves.toBe(true);
    });

    it("returns true when the server advertises the unstable feature", async () => {
        const client = clientWithVersions(
            vi.fn(() =>
                Promise.resolve({ versions: ["v1.6"], unstable_features: { "org.matrix.msc3916.stable": true } }),
            ),
        );
        await expect(serverSupportsAuthenticatedMedia(client)).resolves.toBe(true);
    });

    it("returns false when neither spec version nor unstable feature are present", async () => {
        const client = clientWithVersions(
            vi.fn(() =>
                Promise.resolve({ versions: ["v1.6"], unstable_features: { "org.matrix.msc3916.stable": false } }),
            ),
        );
        await expect(serverSupportsAuthenticatedMedia(client)).resolves.toBe(false);
    });

    it("falls back to false (legacy media) when version detection throws", async () => {
        const client = clientWithVersions(vi.fn(() => Promise.reject(new Error("network"))));
        await expect(serverSupportsAuthenticatedMedia(client)).resolves.toBe(false);
    });

    it("memoises a successful result per client", async () => {
        const getVersions = vi.fn(() => Promise.resolve({ versions: ["v1.11"], unstable_features: {} }));
        const client = clientWithVersions(getVersions);
        await serverSupportsAuthenticatedMedia(client);
        await serverSupportsAuthenticatedMedia(client);
        expect(getVersions).toHaveBeenCalledTimes(1);
    });

    it("retries after a failure instead of caching it", async () => {
        const getVersions = vi
            .fn()
            .mockRejectedValueOnce(new Error("transient"))
            .mockResolvedValue({ versions: ["v1.11"], unstable_features: {} });
        const client = clientWithVersions(getVersions);
        await expect(serverSupportsAuthenticatedMedia(client)).resolves.toBe(false);
        await expect(serverSupportsAuthenticatedMedia(client)).resolves.toBe(true);
        expect(getVersions).toHaveBeenCalledTimes(2);
    });
});
