import type { IContent, MatrixClient, MatrixEvent } from "matrix-js-sdk";
import type { EncryptedFile, MediaEventContent } from "matrix-js-sdk/lib/@types/media";

type MediaErrorKind = "download" | "decrypt";

export type MatrixResolvedImageMedia = {
    sourceUrl: string | undefined;
    thumbnailUrl: string | undefined;
    isEncrypted: boolean;
    error: MediaErrorKind | undefined;
    cleanup: () => void;
};

export type MatrixResolvedAttachmentMedia = {
    sourceUrl: string | undefined;
    isEncrypted: boolean;
    error: MediaErrorKind | undefined;
    cleanup: () => void;
};

/**
 * Authenticated media (MSC3916 / spec v1.11) options.
 *
 * When omitted, media resolution keeps its legacy behaviour (unauthenticated
 * endpoints, plain fetch), so nothing changes on homeservers that do not enforce
 * authenticated media.
 */
export type MatrixMediaResolveOptions = {
    /**
     * Emit authenticated (`/_matrix/client/v1/media/...`) URLs for unencrypted
     * media that is consumed by DOM elements (`<img>`, `<audio>`, `<video>`,
     * download links). The Authorization header is injected by the media service
     * worker, so this must only be true when that worker is active.
     */
    useAuthenticatedUrls?: boolean;
    /**
     * For encrypted media, which is downloaded and decrypted directly by the
     * page rather than by a DOM element.
     */
    encryptedDownload?: {
        useAuthenticatedUrls?: boolean;
        authorizationHeader?: Record<string, string> | undefined;
    };
};

type BlobUrlRegistry = {
    createFromBuffer: (buffer: ArrayBuffer, mimeType: string | undefined) => string;
    cleanup: () => void;
};

class MediaDownloadError extends Error {}
class MediaDecryptError extends Error {}

function decodeBase64Unpadded(value: string): Uint8Array<ArrayBuffer> {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}

async function assertCipherHash(
    cipherText: Uint8Array<ArrayBuffer>,
    expectedSha256: string | undefined,
): Promise<void> {
    if (expectedSha256 === undefined) {
        return;
    }
    const digest = await crypto.subtle.digest("SHA-256", cipherText);
    const digestBytes = new Uint8Array(digest);
    const expectedBytes = decodeBase64Unpadded(expectedSha256);
    if (digestBytes.length !== expectedBytes.length) {
        throw new MediaDecryptError("ciphertext hash mismatch");
    }
    for (let index = 0; index < digestBytes.length; index += 1) {
        if (digestBytes[index] !== expectedBytes[index]) {
            throw new MediaDecryptError("ciphertext hash mismatch");
        }
    }
}

async function decryptEncryptedFile(
    cipherText: Uint8Array<ArrayBuffer>,
    encryptedFile: EncryptedFile,
): Promise<ArrayBuffer> {
    await assertCipherHash(cipherText, encryptedFile.hashes?.sha256);
    const keyData = decodeBase64Unpadded(encryptedFile.key.k);
    const iv = decodeBase64Unpadded(encryptedFile.iv);
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, "AES-CTR", false, ["decrypt"]);
    return crypto.subtle.decrypt({ name: "AES-CTR", counter: iv, length: 64 }, cryptoKey, cipherText);
}

function createBlobUrlRegistry(): BlobUrlRegistry {
    const blobUrls = new Set<string>();

    const createFromBuffer = (buffer: ArrayBuffer, mimeType: string | undefined): string => {
        const blob = new Blob([buffer], { type: mimeType ?? "application/octet-stream" });
        const blobUrl = URL.createObjectURL(blob);
        blobUrls.add(blobUrl);
        return blobUrl;
    };

    const cleanup = () => {
        blobUrls.forEach((blobUrl) => URL.revokeObjectURL(blobUrl));
        blobUrls.clear();
    };

    return { createFromBuffer, cleanup };
}

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
}

function isEncryptedMediaContent(content: MediaEventContent): boolean {
    return content.file !== undefined;
}

function toMediaEventContent(content: IContent): MediaEventContent | undefined {
    if (typeof content !== "object" || content === null) {
        return undefined;
    }
    if (typeof content.body !== "string") {
        return undefined;
    }
    if (content.msgtype !== "m.image") {
        return undefined;
    }
    return content as MediaEventContent;
}

function toAttachmentMediaEventContent(content: IContent): MediaEventContent | undefined {
    if (typeof content !== "object" || content === null) {
        return undefined;
    }
    if (typeof content.body !== "string") {
        return undefined;
    }
    if (content.msgtype !== "m.file" && content.msgtype !== "m.audio" && content.msgtype !== "m.video") {
        return undefined;
    }
    return content as MediaEventContent;
}

function getThumbnailEncryptedFile(content: MediaEventContent): EncryptedFile | undefined {
    const info = content.info as
        | {
              thumbnail_file?: EncryptedFile;
          }
        | undefined;
    return info?.thumbnail_file;
}

function getHttpUrl(client: MatrixClient, mxcUrl: string | undefined, useAuthentication = false): string | undefined {
    if (mxcUrl === undefined) {
        return undefined;
    }
    return (
        client.mxcUrlToHttp(mxcUrl, undefined, undefined, undefined, undefined, undefined, useAuthentication) ??
        undefined
    );
}

async function downloadArrayBuffer(
    url: string,
    signal: AbortSignal,
    headers?: Record<string, string>,
): Promise<ArrayBuffer> {
    const response = await fetch(url, headers ? { signal, headers } : { signal });
    if (!response.ok) {
        throw new MediaDownloadError("media download failed");
    }
    return response.arrayBuffer();
}

async function resolveEncryptedBlobUrl(
    client: MatrixClient,
    encryptedFile: EncryptedFile,
    mimeType: string | undefined,
    blobRegistry: BlobUrlRegistry,
    signal: AbortSignal,
    encryptedDownload: MatrixMediaResolveOptions["encryptedDownload"],
): Promise<string> {
    const downloadUrl = getHttpUrl(client, encryptedFile.url, encryptedDownload?.useAuthenticatedUrls ?? false);
    if (downloadUrl === undefined) {
        throw new MediaDownloadError("missing encrypted media URL");
    }
    const encryptedBuffer = await downloadArrayBuffer(downloadUrl, signal, encryptedDownload?.authorizationHeader);
    let decryptedBuffer: ArrayBuffer;
    try {
        decryptedBuffer = await decryptEncryptedFile(new Uint8Array(encryptedBuffer), encryptedFile);
    } catch {
        throw new MediaDecryptError("media decrypt failed");
    }
    return blobRegistry.createFromBuffer(decryptedBuffer, mimeType);
}

export async function resolveImageMediaFromEvent(
    event: MatrixEvent,
    client: MatrixClient,
    signal: AbortSignal,
    options: MatrixMediaResolveOptions = {},
): Promise<MatrixResolvedImageMedia> {
    const rawContent = event.getOriginalContent();
    const content = toMediaEventContent(rawContent);
    const blobRegistry = createBlobUrlRegistry();
    const useAuthenticatedUrls = options.useAuthenticatedUrls ?? false;
    if (content === undefined) {
        return {
            sourceUrl: undefined,
            thumbnailUrl: undefined,
            isEncrypted: false,
            error: "download",
            cleanup: blobRegistry.cleanup,
        };
    }

    if (!isEncryptedMediaContent(content)) {
        const thumbnailUrl = (
            content.info as
                | {
                      thumbnail_url?: string;
                  }
                | undefined
        )?.thumbnail_url;
        return {
            isEncrypted: false,
            sourceUrl: getHttpUrl(client, content.url, useAuthenticatedUrls),
            thumbnailUrl: getHttpUrl(client, thumbnailUrl, useAuthenticatedUrls),
            error: undefined,
            cleanup: blobRegistry.cleanup,
        };
    }

    try {
        const encryptedSourceFile = content.file;
        if (encryptedSourceFile === undefined) {
            return {
                sourceUrl: undefined,
                thumbnailUrl: undefined,
                isEncrypted: true,
                error: "download",
                cleanup: blobRegistry.cleanup,
            };
        }
        const sourceUrl = await resolveEncryptedBlobUrl(
            client,
            encryptedSourceFile,
            content.info?.mimetype,
            blobRegistry,
            signal,
            options.encryptedDownload,
        );
        const thumbnailFile = getThumbnailEncryptedFile(content);
        if (thumbnailFile === undefined) {
            return {
                sourceUrl,
                thumbnailUrl: undefined,
                isEncrypted: true,
                error: undefined,
                cleanup: blobRegistry.cleanup,
            };
        }

        const thumbnailUrl = await resolveEncryptedBlobUrl(
            client,
            thumbnailFile,
            (
                content.info as
                    | {
                          thumbnail_info?: { mimetype?: string };
                      }
                    | undefined
            )?.thumbnail_info?.mimetype,
            blobRegistry,
            signal,
            options.encryptedDownload,
        );
        return { sourceUrl, thumbnailUrl, isEncrypted: true, error: undefined, cleanup: blobRegistry.cleanup };
    } catch (error) {
        if (isAbortError(error)) {
            blobRegistry.cleanup();
            throw error;
        }
        return {
            sourceUrl: undefined,
            thumbnailUrl: undefined,
            isEncrypted: true,
            error: error instanceof MediaDownloadError ? "download" : "decrypt",
            cleanup: blobRegistry.cleanup,
        };
    }
}

export async function resolveAttachmentMediaFromEvent(
    event: MatrixEvent,
    client: MatrixClient,
    signal: AbortSignal,
    options: MatrixMediaResolveOptions = {},
): Promise<MatrixResolvedAttachmentMedia> {
    const rawContent = event.getOriginalContent();
    const content = toAttachmentMediaEventContent(rawContent);
    const blobRegistry = createBlobUrlRegistry();
    if (content === undefined) {
        return {
            sourceUrl: undefined,
            isEncrypted: false,
            error: "download",
            cleanup: blobRegistry.cleanup,
        };
    }

    if (!isEncryptedMediaContent(content)) {
        return {
            isEncrypted: false,
            sourceUrl: getHttpUrl(client, content.url ?? content.file?.url, options.useAuthenticatedUrls ?? false),
            error: undefined,
            cleanup: blobRegistry.cleanup,
        };
    }

    try {
        const encryptedSourceFile = content.file;
        if (encryptedSourceFile === undefined) {
            return {
                sourceUrl: undefined,
                isEncrypted: true,
                error: "download",
                cleanup: blobRegistry.cleanup,
            };
        }
        const sourceUrl = await resolveEncryptedBlobUrl(
            client,
            encryptedSourceFile,
            content.info?.mimetype,
            blobRegistry,
            signal,
            options.encryptedDownload,
        );
        return { sourceUrl, isEncrypted: true, error: undefined, cleanup: blobRegistry.cleanup };
    } catch (error) {
        if (isAbortError(error)) {
            blobRegistry.cleanup();
            throw error;
        }
        return {
            sourceUrl: undefined,
            isEncrypted: true,
            error: error instanceof MediaDownloadError ? "download" : "decrypt",
            cleanup: blobRegistry.cleanup,
        };
    }
}
