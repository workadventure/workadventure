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

type BlobUrlRegistry = {
    createFromBuffer: (buffer: ArrayBuffer, mimeType: string | undefined) => string;
    cleanup: () => void;
};

class MediaDownloadError extends Error {}
class MediaDecryptError extends Error {}

function decodeBase64Unpadded(value: string): Uint8Array {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}

async function assertCipherHash(cipherText: Uint8Array, expectedSha256: string | undefined): Promise<void> {
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

async function decryptEncryptedFile(cipherText: Uint8Array, encryptedFile: EncryptedFile): Promise<ArrayBuffer> {
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

function isEncryptedImageContent(content: MediaEventContent): boolean {
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

function getThumbnailEncryptedFile(content: MediaEventContent): EncryptedFile | undefined {
    const info = content.info as
        | {
              thumbnail_file?: EncryptedFile;
          }
        | undefined;
    return info?.thumbnail_file;
}

function getHttpUrl(client: MatrixClient, mxcUrl: string | undefined): string | undefined {
    if (mxcUrl === undefined) {
        return undefined;
    }
    return client.mxcUrlToHttp(mxcUrl) ?? undefined;
}

async function downloadArrayBuffer(url: string, signal: AbortSignal): Promise<ArrayBuffer> {
    const response = await fetch(url, { signal });
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
    signal: AbortSignal
): Promise<string> {
    const downloadUrl = getHttpUrl(client, encryptedFile.url);
    if (downloadUrl === undefined) {
        throw new MediaDownloadError("missing encrypted media URL");
    }
    const encryptedBuffer = await downloadArrayBuffer(downloadUrl, signal);
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
    signal: AbortSignal
): Promise<MatrixResolvedImageMedia> {
    const rawContent = event.getOriginalContent();
    const content = toMediaEventContent(rawContent);
    const blobRegistry = createBlobUrlRegistry();
    if (content === undefined) {
        return {
            sourceUrl: undefined,
            thumbnailUrl: undefined,
            isEncrypted: false,
            error: "download",
            cleanup: blobRegistry.cleanup,
        };
    }

    if (!isEncryptedImageContent(content)) {
        const thumbnailUrl = (
            content.info as
                | {
                      thumbnail_url?: string;
                  }
                | undefined
        )?.thumbnail_url;
        return {
            isEncrypted: false,
            sourceUrl: getHttpUrl(client, content.url),
            thumbnailUrl: getHttpUrl(client, thumbnailUrl),
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
            signal
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
            signal
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
