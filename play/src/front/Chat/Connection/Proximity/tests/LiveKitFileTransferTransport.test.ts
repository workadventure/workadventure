import type { PrivateSpaceEvent } from "@workadventure/messages";
import { describe, expect, it, vi } from "vitest";
import { getProximityFileTransferLiveKitTopic, LiveKitFileTransferTransport } from "../LiveKitFileTransferTransport";
import type { LiveKitProximityFileStreamHandler } from "../LiveKitFileTransferTransport";
import type {
    IncomingProximityFileTransferOffer,
    ProximityFileTransferUpdate,
} from "../ProximityFileTransferTransport";
import {
    encryptProximityFileBlob,
    generateProximityFileEncryptionKey,
    hashProximityFileBlob,
} from "../ProximityFileTransferSecurity";

describe("LiveKitFileTransferTransport", () => {
    it("should batch LiveKit download requests by transfer id", async () => {
        vi.useFakeTimers();
        const file = new File(["hello"], "hello.txt", { type: "text/plain" });
        const sendFileToIdentities = vi.fn().mockResolvedValue(undefined);
        const transport = new LiveKitFileTransferTransport({
            localSpaceUserId: "sender",
            space: {
                emitPrivateMessage: vi.fn(),
            },
            liveKitRoom: {
                getIdentityForSpaceUserId: (spaceUserId) => `identity-${spaceUserId}`,
                hasParticipant: () => true,
                sendFileToIdentities,
                registerProximityFileHandler: () => () => undefined,
            },
            batchDelayMs: 1_000,
        });
        transport.sendFile(file, "transfer-1", ["recipient-1", "recipient-2"]);

        await transport.handleSignal?.("recipient-1", {
            transferId: "transfer-1",
            connectionId: "livekit",
            signal: JSON.stringify({ type: "livekit_file_request" }),
        });
        await transport.handleSignal?.("recipient-2", {
            transferId: "transfer-1",
            connectionId: "livekit",
            signal: JSON.stringify({ type: "livekit_file_request" }),
        });

        await vi.advanceTimersByTimeAsync(1_000);

        expect(sendFileToIdentities).toHaveBeenCalledWith(file, {
            destinationIdentities: ["identity-recipient-1", "identity-recipient-2"],
            topic: getProximityFileTransferLiveKitTopic("transfer-1"),
        });
        vi.useRealTimers();
    });

    it("should request downloads through a private transfer signal", async () => {
        const emitPrivateMessage = vi.fn();
        const transport = new LiveKitFileTransferTransport({
            localSpaceUserId: "recipient",
            space: {
                emitPrivateMessage,
            },
            liveKitRoom: {
                getIdentityForSpaceUserId: () => "identity-sender",
                hasParticipant: () => true,
                sendFileToIdentities: vi.fn().mockResolvedValue(undefined),
                registerProximityFileHandler: () => () => undefined,
            },
        });

        await transport.requestDownload({
            transferId: "transfer-1",
            fileName: "hello.txt",
            mimeType: "text/plain",
            size: 5,
            messageType: "file",
            characterTextures: [],
            name: undefined,
            senderSpaceUserId: "sender",
        });

        expect(
            emitPrivateMessage.mock.calls.map(([message, receiver]) => [
                (message as NonNullable<PrivateSpaceEvent["event"]>).$case,
                JSON.parse(
                    (message as { proximityFileTransferSignal: { signal: string } }).proximityFileTransferSignal.signal,
                ).type,
                receiver,
            ]),
        ).toEqual([["proximityFileTransferSignal", "livekit_file_request", "sender"]]);
    });

    it("should emit a ready update when the expected LiveKit stream is received", async () => {
        vi.stubGlobal("URL", { createObjectURL: vi.fn().mockReturnValue("blob:transfer-1") });
        let streamHandler: LiveKitProximityFileStreamHandler | undefined;
        const transport = new LiveKitFileTransferTransport({
            localSpaceUserId: "recipient",
            space: {
                emitPrivateMessage: vi.fn(),
            },
            liveKitRoom: {
                getIdentityForSpaceUserId: (spaceUserId) => `identity-${spaceUserId}`,
                hasParticipant: () => true,
                sendFileToIdentities: vi.fn().mockResolvedValue(undefined),
                registerProximityFileHandler: (_topic, handler) => {
                    streamHandler = handler;
                    return () => undefined;
                },
            },
        });
        const updates: ProximityFileTransferUpdate[] = [];
        const subscription = transport.transferUpdates.subscribe((update) => updates.push(update));
        await transport.requestDownload({
            transferId: "transfer-1",
            fileName: "hello.txt",
            mimeType: "text/plain",
            size: 5,
            messageType: "file",
            characterTextures: [],
            name: undefined,
            senderSpaceUserId: "sender",
        });

        await streamHandler?.(
            {
                info: {
                    name: "hello.txt",
                    mimeType: "text/plain",
                    size: 5,
                },
                readAll: () => Promise.resolve(["hello"]),
            },
            "identity-sender",
        );

        expect(updates).toEqual([
            { transferId: "transfer-1", state: "downloading", progress: 0 },
            expect.objectContaining({ transferId: "transfer-1", state: "ready", progress: 1 }),
        ]);
        subscription.unsubscribe();
        vi.unstubAllGlobals();
    });

    it("should forward LiveKit stream progress while reading", async () => {
        vi.stubGlobal("URL", { createObjectURL: vi.fn().mockReturnValue("blob:transfer-1") });
        let streamHandler: LiveKitProximityFileStreamHandler | undefined;
        const transport = createReceivingTransport((handler) => {
            streamHandler = handler;
        });
        const updates: ProximityFileTransferUpdate[] = [];
        const subscription = transport.transferUpdates.subscribe((update) => updates.push(update));
        await transport.requestDownload({
            transferId: "transfer-1",
            fileName: "hello.txt",
            mimeType: "text/plain",
            size: 5,
            messageType: "file",
            characterTextures: [],
            name: undefined,
            senderSpaceUserId: "sender",
        });
        const stream: {
            info: { name: string; mimeType: string; size: number };
            onProgress?: (progress: number | undefined) => void;
            readAll(): Promise<BlobPart[]>;
        } = {
            info: {
                name: "hello.txt",
                mimeType: "text/plain",
                size: 5,
            },
            readAll() {
                stream.onProgress?.(0.4);
                return Promise.resolve(["hello"]);
            },
        };

        await streamHandler?.(stream, "identity-sender");

        expect(updates).toEqual([
            { transferId: "transfer-1", state: "downloading", progress: 0 },
            { transferId: "transfer-1", state: "downloading", progress: 0.4 },
            expect.objectContaining({ transferId: "transfer-1", state: "ready", progress: 1 }),
        ]);
        subscription.unsubscribe();
        vi.unstubAllGlobals();
    });

    it("should route same-name LiveKit streams by transfer topic", async () => {
        vi.stubGlobal("URL", { createObjectURL: vi.fn((blob: Blob) => `blob:${blob.size}`) });
        const streamHandlers = new Map<string, LiveKitProximityFileStreamHandler>();
        const transport = new LiveKitFileTransferTransport({
            localSpaceUserId: "recipient",
            space: {
                emitPrivateMessage: vi.fn(),
            },
            liveKitRoom: {
                getIdentityForSpaceUserId: (spaceUserId) => `identity-${spaceUserId}`,
                hasParticipant: () => true,
                sendFileToIdentities: vi.fn().mockResolvedValue(undefined),
                registerProximityFileHandler: (topic, handler) => {
                    streamHandlers.set(topic, handler);
                    return () => {
                        streamHandlers.delete(topic);
                    };
                },
            },
        });
        const updates: ProximityFileTransferUpdate[] = [];
        const subscription = transport.transferUpdates.subscribe((update) => updates.push(update));
        const baseOffer: Omit<IncomingProximityFileTransferOffer, "transferId"> = {
            fileName: "hello.txt",
            mimeType: "text/plain",
            size: 5,
            messageType: "file",
            characterTextures: [],
            name: undefined,
            senderSpaceUserId: "sender",
        };
        await transport.requestDownload({ ...baseOffer, transferId: "transfer-1" });
        await transport.requestDownload({ ...baseOffer, transferId: "transfer-2" });

        await streamHandlers.get(getProximityFileTransferLiveKitTopic("transfer-2"))?.(
            {
                info: {
                    name: "hello.txt",
                    mimeType: "text/plain",
                    size: 5,
                },
                readAll: () => Promise.resolve(["hello"]),
            },
            "identity-sender",
        );

        expect(updates).toEqual([
            { transferId: "transfer-2", state: "downloading", progress: 0 },
            expect.objectContaining({ transferId: "transfer-2", state: "ready", progress: 1 }),
        ]);
        expect(streamHandlers.has(getProximityFileTransferLiveKitTopic("transfer-1"))).toBe(true);
        expect(streamHandlers.has(getProximityFileTransferLiveKitTopic("transfer-2"))).toBe(false);
        subscription.unsubscribe();
        vi.unstubAllGlobals();
    });

    it("should decrypt and verify an expected encrypted LiveKit stream", async () => {
        vi.stubGlobal("URL", { createObjectURL: vi.fn().mockReturnValue("blob:transfer-1") });
        const key = await generateProximityFileEncryptionKey();
        const source = new Blob(["hello"], { type: "text/plain" });
        const encrypted = await encryptProximityFileBlob(source, key);
        let streamHandler: LiveKitProximityFileStreamHandler | undefined;
        const transport = createReceivingTransport((handler) => {
            streamHandler = handler;
        });
        const updates: ProximityFileTransferUpdate[] = [];
        const subscription = transport.transferUpdates.subscribe((update) => updates.push(update));
        await transport.requestDownload(
            {
                transferId: "transfer-1",
                fileName: "hello.txt",
                mimeType: "text/plain",
                size: 5,
                messageType: "file",
                characterTextures: [],
                name: undefined,
                senderSpaceUserId: "sender",
                sha256: await hashProximityFileBlob(source),
                encryptionAlgorithm: encrypted.metadata.algorithm,
                encryptionKeyId: "transfer-1",
            },
            { encryptionKey: Promise.resolve(key), encryptionMetadata: Promise.resolve(encrypted.metadata) },
        );

        await streamHandler?.(
            {
                info: {
                    name: "hello.txt",
                    mimeType: "text/plain",
                    size: encrypted.blob.size,
                },
                readAll: () => Promise.resolve([encrypted.blob]),
            },
            "identity-sender",
        );

        expect(updates).toEqual([
            { transferId: "transfer-1", state: "downloading", progress: 0 },
            expect.objectContaining({ transferId: "transfer-1", state: "ready", progress: 1 }),
        ]);
        subscription.unsubscribe();
        vi.unstubAllGlobals();
    });

    it("should reject a LiveKit stream that delivers more bytes than the offer announced", async () => {
        vi.stubGlobal("URL", { createObjectURL: vi.fn().mockReturnValue("blob:transfer-1") });
        let streamHandler: LiveKitProximityFileStreamHandler | undefined;
        const transport = createReceivingTransport((handler) => {
            streamHandler = handler;
        });
        const updates: ProximityFileTransferUpdate[] = [];
        const subscription = transport.transferUpdates.subscribe((update) => updates.push(update));
        await transport.requestDownload({
            transferId: "transfer-1",
            fileName: "hello.txt",
            mimeType: "text/plain",
            size: 5,
            messageType: "file",
            characterTextures: [],
            name: undefined,
            senderSpaceUserId: "sender",
        });

        // The stream lies about its size (advertises 5 but streams 11 bytes); it must be rejected
        // before/without surfacing a usable blob so an oversized payload cannot exhaust memory.
        await streamHandler?.(
            {
                info: {
                    name: "hello.txt",
                    mimeType: "text/plain",
                    size: 5,
                },
                readAll: () => Promise.resolve(["hello world"]),
            },
            "identity-sender",
        );

        expect(updates).not.toContainEqual(expect.objectContaining({ transferId: "transfer-1", state: "ready" }));
        expect(updates).toContainEqual(expect.objectContaining({ transferId: "transfer-1", state: "error" }));
        subscription.unsubscribe();
        vi.unstubAllGlobals();
    });

    it("should reject an encrypted LiveKit stream when the decrypted digest does not match", async () => {
        vi.stubGlobal("URL", { createObjectURL: vi.fn().mockReturnValue("blob:transfer-1") });
        const key = await generateProximityFileEncryptionKey();
        const encrypted = await encryptProximityFileBlob(new Blob(["hello"], { type: "text/plain" }), key);
        let streamHandler: LiveKitProximityFileStreamHandler | undefined;
        const transport = createReceivingTransport((handler) => {
            streamHandler = handler;
        });
        const updates: ProximityFileTransferUpdate[] = [];
        const subscription = transport.transferUpdates.subscribe((update) => updates.push(update));
        await transport.requestDownload(
            {
                transferId: "transfer-1",
                fileName: "hello.txt",
                mimeType: "text/plain",
                size: 5,
                messageType: "file",
                characterTextures: [],
                name: undefined,
                senderSpaceUserId: "sender",
                sha256: "wrong-digest",
                encryptionAlgorithm: encrypted.metadata.algorithm,
                encryptionKeyId: "transfer-1",
            },
            { encryptionKey: Promise.resolve(key), encryptionMetadata: Promise.resolve(encrypted.metadata) },
        );

        await streamHandler?.(
            {
                info: {
                    name: "hello.txt",
                    mimeType: "text/plain",
                    size: encrypted.blob.size,
                },
                readAll: () => Promise.resolve([encrypted.blob]),
            },
            "identity-sender",
        );

        expect(updates).toContainEqual({
            transferId: "transfer-1",
            state: "error",
            progress: 0,
            error: "integrity-check-failed",
        });
        subscription.unsubscribe();
        vi.unstubAllGlobals();
    });
});

function createReceivingTransport(
    onRegister: (handler: LiveKitProximityFileStreamHandler) => void,
): LiveKitFileTransferTransport {
    return new LiveKitFileTransferTransport({
        localSpaceUserId: "recipient",
        space: {
            emitPrivateMessage: vi.fn(),
        },
        liveKitRoom: {
            getIdentityForSpaceUserId: (spaceUserId) => `identity-${spaceUserId}`,
            hasParticipant: () => true,
            sendFileToIdentities: vi.fn().mockResolvedValue(undefined),
            registerProximityFileHandler: (_topic, handler) => {
                onRegister(handler);
                return () => undefined;
            },
        },
    });
}
