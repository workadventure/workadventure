import type { PrivateSpaceEvent } from "@workadventure/messages";
import { Subject } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    getMessageTypeFromMimeType,
    PROXIMITY_FILE_TRANSFER_MAX_FILE_SIZE,
    PROXIMITY_FILE_TRANSFER_MAX_INCOMING_OFFERS_PER_PEER,
    ProximityFileTransferService,
    type ProximityFileTransferSpace,
    type ProximityFileTransferUpdate,
    validateProximityFiles,
} from "../ProximityFileTransferService";
import { encodeProximityFileChunkFrame } from "../ProximityFileTransferProtocol";

const HELLO = new TextEncoder().encode("hello");

/** A File the sender can read: jsdom's File has no stream(), so it serves its content as a single chunk. */
function sendableFile(content: Uint8Array<ArrayBuffer>, name: string, type = "text/plain"): File {
    return Object.assign(new File([content], name, { type }), {
        stream: () =>
            new ReadableStream<Uint8Array<ArrayBuffer>>({
                start(controller) {
                    controller.enqueue(content);
                    controller.close();
                },
            }),
    });
}

/** A data channel whose buffer never drains. */
class StuckDataChannel extends EventTarget {
    bufferedAmount = 1024 * 1024;
    readyState: RTCDataChannelState = "open";
    send = vi.fn();

    close(): void {
        this.readyState = "closed";
        this.dispatchEvent(new Event("close"));
    }
}

function offerEvent(transferId: string, size: number, sender = "sender", mimeType = "text/plain") {
    return {
        $case: "proximityFileTransferOffer" as const,
        proximityFileTransferOffer: {
            transferId,
            fileName: "f.txt",
            mimeType,
            size,
            characterTextures: [],
            name: undefined,
        },
        sender: { spaceUserId: sender },
    };
}

type PrivateService = {
    handleDataChannelMessage(session: unknown, data: unknown): Promise<void>;
    sendOutgoingTransfer(session: unknown, transferId: string): Promise<void>;
};

function createService(localSpaceUserId: string) {
    const incomingOffers = new Subject<ReturnType<typeof offerEvent>>();
    const emitPrivateMessage = vi.fn();
    const space = {
        emitPrivateMessage,
        observePrivateEvent: (key: string) =>
            (key === "proximityFileTransferOffer" ? incomingOffers : new Subject()) as never,
    } as ProximityFileTransferSpace;
    const service = new ProximityFileTransferService({
        localSpaceUserId,
        space,
        getIceServers: () => Promise.resolve([]),
        canExchangeWith: () => true,
    });
    const updates: ProximityFileTransferUpdate[] = [];
    const updatesSubscription = service.transferUpdates.subscribe((update) => updates.push(update));
    const privateService = service as unknown as PrivateService;
    // Messages arrive on the data channel opened with the peer named `from`.
    const handleDataChannelMessage = (data: unknown, from = "sender") =>
        privateService.handleDataChannelMessage({ remoteSpaceUserId: from }, data);
    return {
        service,
        privateService,
        incomingOffers,
        emitPrivateMessage,
        updates,
        updatesSubscription,
        handleDataChannelMessage,
    };
}

function startMessage(transferId: string) {
    return JSON.stringify({ type: "proximity_file_start", transferId });
}

function completeMessage(transferId: string) {
    return JSON.stringify({ type: "proximity_file_complete", transferId });
}

describe("validateProximityFiles", () => {
    it("should reject more than three files", () => {
        const files = [
            new File(["a"], "a.txt"),
            new File(["b"], "b.txt"),
            new File(["c"], "c.txt"),
            new File(["d"], "d.txt"),
        ];

        expect(validateProximityFiles(files)).toEqual({ ok: false, reason: "too-many-files" });
    });
});

describe("getMessageTypeFromMimeType", () => {
    it("should only give inline cards to allowlisted types", () => {
        expect(getMessageTypeFromMimeType("image/png")).toBe("image");
        expect(getMessageTypeFromMimeType("Image/PNG; charset=binary")).toBe("image");
        expect(getMessageTypeFromMimeType("image/svg+xml")).toBe("file");
        expect(getMessageTypeFromMimeType("text/html")).toBe("file");
    });
});

describe("ProximityFileTransferService", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("should stream a file from a sender to a receiver", async () => {
        const createObjectURL = vi.fn().mockReturnValue("blob:received");
        vi.stubGlobal("URL", { createObjectURL });
        const sender = createService("sender");
        const receiver = createService("recipient");
        const file = sendableFile(HELLO, "hello.txt");
        const [offer] = sender.service.createOutgoingOffers([file], ["recipient"]);
        receiver.incomingOffers.next(offerEvent(offer.transferId, file.size, "sender", file.type));
        const wire: unknown[] = [];
        const dataChannel = { bufferedAmount: 0, send: (data: unknown) => wire.push(data) };

        await sender.privateService.sendOutgoingTransfer(
            { remoteSpaceUserId: "recipient", dataChannel },
            offer.transferId,
        );
        for (const message of wire) {
            // eslint-disable-next-line no-await-in-loop -- the data channel delivers in order
            await receiver.handleDataChannelMessage(message);
        }

        expect(receiver.updates.at(-1)).toEqual({
            transferId: offer.transferId,
            state: "ready",
            progress: 1,
            url: "blob:received",
        });
        const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
        expect(await blob.text()).toBe("hello");
        expect(blob.type).toBe("application/octet-stream");
    });

    it("should type the received blob from the allowlisted offer mime type", async () => {
        const createObjectURL = vi.fn().mockReturnValue("blob:received");
        vi.stubGlobal("URL", { createObjectURL });
        const { incomingOffers, handleDataChannelMessage } = createService("recipient");
        incomingOffers.next(offerEvent("transfer-1", 5, "sender", "image/svg+xml"));

        await handleDataChannelMessage(startMessage("transfer-1"));
        await handleDataChannelMessage(encodeProximityFileChunkFrame("transfer-1", HELLO));
        await handleDataChannelMessage(completeMessage("transfer-1"));

        expect((createObjectURL.mock.calls[0]?.[0] as Blob).type).toBe("application/octet-stream");
    });

    it("should reassemble a file received in several chunks", async () => {
        const createObjectURL = vi.fn().mockReturnValue("blob:transfer-1");
        vi.stubGlobal("URL", { createObjectURL });
        const { incomingOffers, updates, handleDataChannelMessage } = createService("recipient");
        incomingOffers.next(offerEvent("transfer-1", 5));

        await handleDataChannelMessage(startMessage("transfer-1"));
        for (let offset = 0; offset < HELLO.byteLength; offset += 2) {
            // eslint-disable-next-line no-await-in-loop -- chunks are delivered in order
            await handleDataChannelMessage(
                encodeProximityFileChunkFrame("transfer-1", HELLO.subarray(offset, offset + 2)),
            );
        }
        await handleDataChannelMessage(completeMessage("transfer-1"));

        expect(updates.at(-1)).toMatchObject({ transferId: "transfer-1", state: "ready" });
        expect(await (createObjectURL.mock.calls[0]?.[0] as Blob).text()).toBe("hello");
    });

    it("should stop sending when the data channel closes while waiting for it to drain", async () => {
        const { service, privateService } = createService("sender");
        const [offer] = service.createOutgoingOffers([sendableFile(new Uint8Array(200_000), "big.bin")], ["recipient"]);
        const dataChannel = new StuckDataChannel();
        const sending = privateService.sendOutgoingTransfer(
            { remoteSpaceUserId: "recipient", dataChannel },
            offer.transferId,
        );
        // The start message, then the first chunk before waiting for the channel to drain.
        await vi.waitFor(() => expect(dataChannel.send).toHaveBeenCalledTimes(2));

        dataChannel.close();

        await sending;
        expect(dataChannel.send).toHaveBeenCalledTimes(2);
    });

    it("should ignore an offer re-emitted by another peer with a known transfer id", () => {
        const { service, incomingOffers, updates } = createService("recipient");
        const surfaced: string[] = [];
        const subscription = service.incomingOffers.subscribe((offer) => surfaced.push(offer.senderSpaceUserId));
        incomingOffers.next(offerEvent("transfer-1", 5, "sender"));

        incomingOffers.next(offerEvent("transfer-1", 5, "attacker"));

        expect(surfaced).toEqual(["sender"]);
        expect(updates).toHaveLength(1);
        subscription.unsubscribe();
    });

    it("should ignore data channel messages about a transfer from a peer that did not offer it", async () => {
        const { incomingOffers, updates, handleDataChannelMessage } = createService("recipient");
        incomingOffers.next(offerEvent("transfer-1", 5));

        await handleDataChannelMessage(startMessage("transfer-1"), "attacker");
        await handleDataChannelMessage(encodeProximityFileChunkFrame("transfer-1", HELLO), "attacker");
        await handleDataChannelMessage(
            JSON.stringify({ type: "proximity_file_error", transferId: "transfer-1", reason: "unavailable" }),
            "attacker",
        );

        expect(updates).toEqual([{ transferId: "transfer-1", state: "pending", progress: 0 }]);
    });

    it("should reject a transfer that completes short of the offered size", async () => {
        vi.stubGlobal("URL", { createObjectURL: vi.fn() });
        const { incomingOffers, updates, handleDataChannelMessage } = createService("recipient");
        incomingOffers.next(offerEvent("transfer-1", 5));

        await handleDataChannelMessage(startMessage("transfer-1"));
        await handleDataChannelMessage(encodeProximityFileChunkFrame("transfer-1", HELLO.subarray(0, 4)));
        await handleDataChannelMessage(completeMessage("transfer-1"));

        expect(updates.at(-1)).toMatchObject({ transferId: "transfer-1", state: "error", error: "incomplete" });
    });

    it("should reject incoming chunks beyond the offered size", async () => {
        const { incomingOffers, updates, handleDataChannelMessage } = createService("recipient");
        incomingOffers.next(offerEvent("transfer-1", 0));

        await handleDataChannelMessage(startMessage("transfer-1"));
        await handleDataChannelMessage(encodeProximityFileChunkFrame("transfer-1", new Uint8Array([1])));

        expect(updates).toContainEqual({
            transferId: "transfer-1",
            state: "error",
            progress: 0,
            error: "file-too-large",
        });
    });

    it("should ignore offers above the hard file size cap", () => {
        const { incomingOffers, updates } = createService("recipient");

        incomingOffers.next(offerEvent("transfer-1", PROXIMITY_FILE_TRANSFER_MAX_FILE_SIZE + 1));

        expect(updates).toEqual([]);
    });

    it("should emit one private offer per recipient", () => {
        const { service, emitPrivateMessage } = createService("sender");
        const file = new File(["hello"], "hello.txt", { type: "text/plain" });

        const [offer] = service.createOutgoingOffers([file], ["recipient-1", "sender", "recipient-2"]);

        expect(
            emitPrivateMessage.mock.calls.map(([message, receiver]) => [
                (message as NonNullable<PrivateSpaceEvent["event"]>).$case,
                receiver,
            ]),
        ).toEqual([
            ["proximityFileTransferOffer", "recipient-1"],
            ["proximityFileTransferOffer", "recipient-2"],
        ]);
        expect(emitPrivateMessage.mock.calls[0]?.[0]).toMatchObject({
            proximityFileTransferOffer: { transferId: offer.transferId, size: 5 },
        });
    });

    it("should throttle a peer that floods offers but not penalise other peers", () => {
        const { service, incomingOffers } = createService("recipient");
        const surfaced: string[] = [];
        const subscription = service.incomingOffers.subscribe((offer) => surfaced.push(offer.transferId));

        for (let i = 0; i < PROXIMITY_FILE_TRANSFER_MAX_INCOMING_OFFERS_PER_PEER + 5; i++) {
            incomingOffers.next(offerEvent(`spammer-${i}`, 1, "spammer"));
        }
        // A different peer is unaffected by the spammer reaching its cap.
        incomingOffers.next(offerEvent("other-1", 1, "other"));

        expect(surfaced.filter((id) => id.startsWith("spammer-"))).toHaveLength(
            PROXIMITY_FILE_TRANSFER_MAX_INCOMING_OFFERS_PER_PEER,
        );
        expect(surfaced).toContain("other-1");
        subscription.unsubscribe();
    });
});
