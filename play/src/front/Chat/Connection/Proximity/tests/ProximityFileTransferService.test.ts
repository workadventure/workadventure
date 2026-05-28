import type { PrivateSpaceEvent } from "@workadventure/messages";
import { Subject } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import {
    ProximityFileTransferService,
    type ProximityFileTransferTransport,
    validateProximityFiles,
} from "../ProximityFileTransferService";

describe("validateProximityFiles", () => {
    it("should reject more than three files", () => {
        const files = [
            new File(["a"], "a.txt"),
            new File(["b"], "b.txt"),
            new File(["c"], "c.txt"),
            new File(["d"], "d.txt"),
        ];

        const result = validateProximityFiles(files);

        expect(result).toEqual({ ok: false, reason: "too-many-files" });
    });
});

describe("ProximityFileTransferService", () => {
    it("should emit one private offer per recipient", () => {
        const emitPrivateMessage = vi.fn();
        const service = new ProximityFileTransferService({
            localSpaceUserId: "sender",
            space: {
                emitPrivateMessage,
                observePrivateEvent: () => new Subject() as never,
            },
            getIceServers: () => Promise.resolve([]),
        });

        service.createOutgoingOffers(
            [new File(["hello"], "hello.txt", { type: "text/plain" })],
            [{ spaceUserId: "recipient-1" }, { spaceUserId: "recipient-2" }]
        );

        expect(
            emitPrivateMessage.mock.calls.map(([message, receiver]) => [
                (message as NonNullable<PrivateSpaceEvent["event"]>).$case,
                receiver,
            ])
        ).toEqual([
            ["proximityFileTransferOffer", "recipient-1"],
            ["proximityFileTransferOffer", "recipient-2"],
        ]);
    });

    it("should register outgoing files on the injected transfer transport", () => {
        const sendFile = vi.fn();
        const transport: ProximityFileTransferTransport = {
            kind: "webrtc",
            canTransferTo: () => true,
            requestDownload: vi.fn().mockResolvedValue(undefined),
            sendFile,
            destroy: vi.fn(),
        };
        const file = new File(["hello"], "hello.txt", { type: "text/plain" });
        const service = new ProximityFileTransferService({
            localSpaceUserId: "sender",
            space: {
                emitPrivateMessage: vi.fn(),
                observePrivateEvent: () => new Subject() as never,
            },
            transferTransport: transport,
        });

        const [offer] = service.createOutgoingOffers([file], [{ spaceUserId: "recipient-1" }]);

        expect(sendFile).toHaveBeenCalledWith(file, offer.transferId, ["recipient-1"]);
    });

    it("should request downloads through the injected transfer transport", async () => {
        const incomingOffers = new Subject<{
            $case: "proximityFileTransferOffer";
            proximityFileTransferOffer: {
                transferId: string;
                fileName: string;
                mimeType: string;
                size: number;
                messageType: string;
                characterTextures: [];
                name: undefined;
            };
            sender: string;
        }>();
        const requestDownload = vi.fn().mockResolvedValue(undefined);
        const transport: ProximityFileTransferTransport = {
            kind: "webrtc",
            canTransferTo: () => true,
            requestDownload,
            sendFile: vi.fn(),
            destroy: vi.fn(),
        };
        const service = new ProximityFileTransferService({
            localSpaceUserId: "recipient",
            space: {
                emitPrivateMessage: vi.fn(),
                observePrivateEvent: (key) => {
                    if (key === "proximityFileTransferOffer") {
                        return incomingOffers as never;
                    }
                    return new Subject() as never;
                },
            },
            transferTransport: transport,
        });
        incomingOffers.next({
            $case: "proximityFileTransferOffer",
            proximityFileTransferOffer: {
                transferId: "transfer-1",
                fileName: "hello.txt",
                mimeType: "text/plain",
                size: 5,
                messageType: "file",
                characterTextures: [],
                name: undefined,
            },
            sender: "sender",
        });

        await service.download("transfer-1");

        expect(requestDownload).toHaveBeenCalledWith(
            expect.objectContaining({ transferId: "transfer-1", senderSpaceUserId: "sender" })
        );
    });

    it("should delegate non WebRTC transfer signals to the injected transport", async () => {
        const signalEvents = new Subject<{
            $case: "proximityFileTransferSignal";
            proximityFileTransferSignal: { transferId: string; connectionId: string; signal: string };
            sender: string;
        }>();
        const handleSignal = vi.fn().mockResolvedValue(undefined);
        const transport: ProximityFileTransferTransport = {
            kind: "livekit",
            canTransferTo: () => true,
            requestDownload: vi.fn().mockResolvedValue(undefined),
            sendFile: vi.fn(),
            handleSignal,
            destroy: vi.fn(),
        };
        new ProximityFileTransferService({
            localSpaceUserId: "recipient",
            space: {
                emitPrivateMessage: vi.fn(),
                observePrivateEvent: (key) => {
                    if (key === "proximityFileTransferSignal") {
                        return signalEvents as never;
                    }
                    return new Subject() as never;
                },
            },
            transferTransport: transport,
        });

        signalEvents.next({
            $case: "proximityFileTransferSignal",
            proximityFileTransferSignal: {
                transferId: "transfer-1",
                connectionId: "livekit",
                signal: JSON.stringify({ type: "livekit_file_request" }),
            },
            sender: "sender",
        });

        await vi.waitFor(() => {
            expect(handleSignal).toHaveBeenCalledWith("sender", {
                transferId: "transfer-1",
                connectionId: "livekit",
                signal: JSON.stringify({ type: "livekit_file_request" }),
            });
        });
    });
});
