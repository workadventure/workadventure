import type { MatrixClient, MatrixEvent } from "matrix-js-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAttachmentMediaFromEvent } from "../MatrixMediaResolver";

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe("resolveAttachmentMediaFromEvent", () => {
    it("should return an HTTP URL for unencrypted m.file", async () => {
        const client = {
            mxcUrlToHttp: (mxc: string) => `https://example.com/media?mxc=${encodeURIComponent(mxc)}`,
        } as unknown as MatrixClient;

        const event = {
            getOriginalContent: () => ({
                msgtype: "m.file",
                body: "report.pdf",
                url: "mxc://example.org/abcdef",
                info: { mimetype: "application/pdf", size: 1024 },
            }),
        } as unknown as MatrixEvent;

        const result = await resolveAttachmentMediaFromEvent(event, client, new AbortController().signal);

        expect(result.error).toBeUndefined();
        expect(result.isEncrypted).toBe(false);
        expect(result.sourceUrl).toBe("https://example.com/media?mxc=mxc%3A%2F%2Fexample.org%2Fabcdef");
        result.cleanup();
    });

    it("should return an HTTP URL for unencrypted m.video", async () => {
        const client = {
            mxcUrlToHttp: (mxc: string) => `https://example.com/v/${encodeURIComponent(mxc)}`,
        } as unknown as MatrixClient;

        const event = {
            getOriginalContent: () => ({
                msgtype: "m.video",
                body: "clip.mp4",
                url: "mxc://example.org/video-id",
                info: { mimetype: "video/mp4" },
            }),
        } as unknown as MatrixEvent;

        const result = await resolveAttachmentMediaFromEvent(event, client, new AbortController().signal);

        expect(result.error).toBeUndefined();
        expect(result.sourceUrl).toContain("mxc%3A%2F%2Fexample.org%2Fvideo-id");
        result.cleanup();
    });

    it("should report download error when content is not a file attachment", async () => {
        const client = {} as unknown as MatrixClient;

        const event = {
            getOriginalContent: () => ({
                msgtype: "m.text",
                body: "hello",
            }),
        } as unknown as MatrixEvent;

        const result = await resolveAttachmentMediaFromEvent(event, client, new AbortController().signal);

        expect(result.error).toBe("download");
        expect(result.sourceUrl).toBeUndefined();
        result.cleanup();
    });

    it("should create a blob URL for encrypted attachments", async () => {
        const encryptedBuffer = new Uint8Array([1, 2, 3]).buffer;
        const decryptedBuffer = new Uint8Array([4, 5, 6]).buffer;
        const createObjectUrlSpy = vi.fn(() => "blob:attachment");
        const revokeObjectUrlSpy = vi.fn();

        vi.stubGlobal(
            "fetch",
            vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    arrayBuffer: () => Promise.resolve(encryptedBuffer),
                }),
            ),
        );
        vi.stubGlobal("URL", {
            createObjectURL: createObjectUrlSpy,
            revokeObjectURL: revokeObjectUrlSpy,
        });
        vi.stubGlobal("crypto", {
            subtle: {
                digest: vi.fn(() => Promise.resolve(new Uint8Array([9, 8, 7]).buffer)),
                importKey: vi.fn(() => Promise.resolve("imported-key")),
                decrypt: vi.fn(() => Promise.resolve(decryptedBuffer)),
            },
        });

        const client = {
            mxcUrlToHttp: (mxc: string) => `https://example.com/media?mxc=${encodeURIComponent(mxc)}`,
        } as unknown as MatrixClient;

        const event = {
            getOriginalContent: () => ({
                msgtype: "m.file",
                body: "secret.pdf",
                file: {
                    url: "mxc://example.org/encrypted",
                    iv: "AA",
                    hashes: { sha256: "CQgH" },
                    key: { k: "AQIDBA", alg: "A256CTR", ext: true, key_ops: ["encrypt", "decrypt"], kty: "oct" },
                    v: "v2",
                },
                info: { mimetype: "application/pdf" },
            }),
        } as unknown as MatrixEvent;

        const result = await resolveAttachmentMediaFromEvent(event, client, new AbortController().signal);

        expect(result.error).toBeUndefined();
        expect(result.isEncrypted).toBe(true);
        expect(result.sourceUrl).toBe("blob:attachment");
        expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);

        result.cleanup();
        expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:attachment");
    });

    it("should map encrypted attachment decrypt failures to decrypt errors", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
                }),
            ),
        );
        vi.stubGlobal("URL", {
            createObjectURL: vi.fn(() => "blob:unused"),
            revokeObjectURL: vi.fn(),
        });
        vi.stubGlobal("crypto", {
            subtle: {
                digest: vi.fn(() => Promise.resolve(new Uint8Array([9, 8, 7]).buffer)),
                importKey: vi.fn(() => Promise.reject(new Error("bad key"))),
                decrypt: vi.fn(),
            },
        });

        const client = {
            mxcUrlToHttp: (mxc: string) => `https://example.com/media?mxc=${encodeURIComponent(mxc)}`,
        } as unknown as MatrixClient;

        const event = {
            getOriginalContent: () => ({
                msgtype: "m.audio",
                body: "secret.ogg",
                file: {
                    url: "mxc://example.org/encrypted-audio",
                    iv: "AA",
                    hashes: { sha256: "CQgH" },
                    key: { k: "AQIDBA", alg: "A256CTR", ext: true, key_ops: ["encrypt", "decrypt"], kty: "oct" },
                    v: "v2",
                },
                info: { mimetype: "audio/ogg" },
            }),
        } as unknown as MatrixEvent;

        const result = await resolveAttachmentMediaFromEvent(event, client, new AbortController().signal);

        expect(result.isEncrypted).toBe(true);
        expect(result.sourceUrl).toBeUndefined();
        expect(result.error).toBe("decrypt");
        result.cleanup();
    });
});

describe("resolveAttachmentMediaFromEvent authenticated media", () => {
    it("targets the authenticated endpoint for unencrypted media when enabled", async () => {
        const mxcUrlToHttp = vi.fn(
            (mxc: string, _w?: number, _h?: number, _rm?: string, _adl?: boolean, _ar?: boolean, useAuth?: boolean) =>
                `https://hs/${useAuth ? "v1" : "legacy"}?mxc=${encodeURIComponent(mxc)}`,
        );
        const client = { mxcUrlToHttp } as unknown as MatrixClient;

        const event = {
            getOriginalContent: () => ({
                msgtype: "m.file",
                body: "report.pdf",
                url: "mxc://example.org/abcdef",
            }),
        } as unknown as MatrixEvent;

        const result = await resolveAttachmentMediaFromEvent(event, client, new AbortController().signal, {
            useAuthenticatedUrls: true,
        });

        expect(result.error).toBeUndefined();
        expect(result.sourceUrl).toBe("https://hs/v1?mxc=mxc%3A%2F%2Fexample.org%2Fabcdef");
        expect(mxcUrlToHttp).toHaveBeenCalledWith(
            "mxc://example.org/abcdef",
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            true,
        );
        result.cleanup();
    });

    it("keeps the legacy endpoint for unencrypted media when disabled", async () => {
        const mxcUrlToHttp = vi.fn(
            (mxc: string, _w?: number, _h?: number, _rm?: string, _adl?: boolean, _ar?: boolean, useAuth?: boolean) =>
                `https://hs/${useAuth ? "v1" : "legacy"}?mxc=${encodeURIComponent(mxc)}`,
        );
        const client = { mxcUrlToHttp } as unknown as MatrixClient;

        const event = {
            getOriginalContent: () => ({ msgtype: "m.file", body: "report.pdf", url: "mxc://example.org/abcdef" }),
        } as unknown as MatrixEvent;

        const result = await resolveAttachmentMediaFromEvent(event, client, new AbortController().signal);

        expect(result.sourceUrl).toBe("https://hs/legacy?mxc=mxc%3A%2F%2Fexample.org%2Fabcdef");
        expect(mxcUrlToHttp).toHaveBeenCalledWith(
            "mxc://example.org/abcdef",
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            false,
        );
        result.cleanup();
    });

    it("adds the Authorization header when downloading encrypted media with auth", async () => {
        const encryptedBuffer = new Uint8Array([1, 2, 3]).buffer;
        const decryptedBuffer = new Uint8Array([4, 5, 6]).buffer;
        const fetchSpy = vi.fn(() =>
            Promise.resolve({
                ok: true,
                arrayBuffer: () => Promise.resolve(encryptedBuffer),
            }),
        );
        vi.stubGlobal("fetch", fetchSpy);
        vi.stubGlobal("URL", {
            createObjectURL: vi.fn(() => "blob:auth"),
            revokeObjectURL: vi.fn(),
        });
        vi.stubGlobal("crypto", {
            subtle: {
                digest: vi.fn(() => Promise.resolve(new Uint8Array([9, 8, 7]).buffer)),
                importKey: vi.fn(() => Promise.resolve("imported-key")),
                decrypt: vi.fn(() => Promise.resolve(decryptedBuffer)),
            },
        });

        const mxcUrlToHttp = vi.fn(
            (mxc: string, _w?: number, _h?: number, _rm?: string, _adl?: boolean, _ar?: boolean, useAuth?: boolean) =>
                `https://hs/${useAuth ? "v1" : "legacy"}/${encodeURIComponent(mxc)}`,
        );
        const client = { mxcUrlToHttp } as unknown as MatrixClient;

        const event = {
            getOriginalContent: () => ({
                msgtype: "m.file",
                body: "secret.pdf",
                file: {
                    url: "mxc://example.org/encrypted",
                    iv: "AA",
                    hashes: { sha256: "CQgH" },
                    key: { k: "AQIDBA", alg: "A256CTR", ext: true, key_ops: ["encrypt", "decrypt"], kty: "oct" },
                    v: "v2",
                },
                info: { mimetype: "application/pdf" },
            }),
        } as unknown as MatrixEvent;

        const result = await resolveAttachmentMediaFromEvent(event, client, new AbortController().signal, {
            encryptedDownload: {
                useAuthenticatedUrls: true,
                authorizationHeader: { Authorization: "Bearer token" },
            },
        });

        expect(result.error).toBeUndefined();
        expect(result.sourceUrl).toBe("blob:auth");
        expect(mxcUrlToHttp).toHaveBeenCalledWith(
            "mxc://example.org/encrypted",
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            true,
        );
        expect(fetchSpy).toHaveBeenCalledWith("https://hs/v1/mxc%3A%2F%2Fexample.org%2Fencrypted", {
            signal: expect.anything(),
            headers: { Authorization: "Bearer token" },
        });
        result.cleanup();
    });
});
