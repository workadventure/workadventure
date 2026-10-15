import type { IContent, MatrixClient, MatrixEvent } from "matrix-js-sdk";
import type { EncryptedFile, MediaEventContent } from "matrix-js-sdk/lib/@types/media";
import { sanitizeInlineMimeType } from "../../../Utils/InlineMimeType";

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

function encodeBase64Unpadded(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/=+$/, "");
}

/**
 * Encrypts an attachment the way the Matrix spec describes it ("Sending encrypted attachments"): AES-CTR with a
 * random 256-bit key, a counter block whose low 64 bits start at zero, and the SHA-256 of the ciphertext.
 */
export async function encryptAttachment(
    plainText: ArrayBuffer,
): Promise<{ cipherText: ArrayBuffer; info: Omit<EncryptedFile, "url"> }> {
    const iv = new Uint8Array(16);
    crypto.getRandomValues(iv.subarray(0, 8));
    const cryptoKey = await crypto.subtle.generateKey({ name: "AES-CTR", length: 256 }, true, ["encrypt", "decrypt"]);
    const cipherText = await crypto.subtle.encrypt({ name: "AES-CTR", counter: iv, length: 64 }, cryptoKey, plainText);
    const { k } = await crypto.subtle.exportKey("jwk", cryptoKey);
    if (k === undefined) {
        throw new Error("The attachment key could not be exported");
    }
    const sha256 = await crypto.subtle.digest("SHA-256", cipherText);
    return {
        cipherText,
        info: {
            v: "v2",
            key: { alg: "A256CTR", ext: true, k, key_ops: ["encrypt", "decrypt"], kty: "oct" },
            iv: encodeBase64Unpadded(iv),
            hashes: { sha256: encodeBase64Unpadded(new Uint8Array(sha256)) },
        },
    };
}

/**
 * Uploads the file of an attachment message. In an end-to-end encrypted room, the homeserver only gets the
 * ciphertext: the key goes in the `file` field of the event, which is encrypted with the rest of the message.
 */
export async function uploadAttachment(
    client: MatrixClient,
    file: File,
    isRoomEncrypted: boolean,
): Promise<Pick<MediaEventContent, "url" | "file">> {
    if (!isRoomEncrypted) {
        return { url: (await client.uploadContent(file)).content_uri };
    }
    const { cipherText, info } = await encryptAttachment(await file.arrayBuffer());
    // A bare Blob has no name and no type: the upload leaks neither the file name nor its mime type.
    const { content_uri } = await client.uploadContent(new Blob([cipherText]));
    return { file: { ...info, url: content_uri } };
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
        // The mime type comes from the event and is not trusted: a same-origin blob: URL typed
        // image/svg+xml or text/html would run scripts at our origin when opened as a document.
        const blob = new Blob([buffer], { type: sanitizeInlineMimeType(mimeType) });
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
    // m.image is in the list because an image whose filename and mimetype disagree is shown as a
    // plain file, and its encrypted media still has to be decrypted through this path.
    if (!["m.file", "m.audio", "m.video", "m.image"].includes(content.msgtype ?? "")) {
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
    signal: AbortSignal,
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
    signal: AbortSignal,
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
            signal,
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
            sourceUrl: getHttpUrl(client, content.url ?? content.file?.url),
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
