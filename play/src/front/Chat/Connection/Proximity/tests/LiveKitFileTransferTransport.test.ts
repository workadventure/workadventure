import type { PrivateSpaceEvent } from "@workadventure/messages";
import { describe, expect, it, vi } from "vitest";
import { LiveKitFileTransferTransport } from "../LiveKitFileTransferTransport";
import type { LiveKitProximityFileStreamHandler } from "../LiveKitFileTransferTransport";
import type { ProximityFileTransferUpdate } from "../ProximityFileTransferTransport";

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
            transferId: "transfer-1",
            destinationIdentities: ["identity-recipient-1", "identity-recipient-2"],
            topic: "wa:proximity-file-transfer",
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
                    (message as { proximityFileTransferSignal: { signal: string } }).proximityFileTransferSignal.signal
                ).type,
                receiver,
            ])
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
                registerProximityFileHandler: (handler) => {
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
            "identity-sender"
        );

        expect(updates).toEqual([
            { transferId: "transfer-1", state: "downloading", progress: 0 },
            expect.objectContaining({ transferId: "transfer-1", state: "ready", progress: 1 }),
        ]);
        subscription.unsubscribe();
        vi.unstubAllGlobals();
    });
});
