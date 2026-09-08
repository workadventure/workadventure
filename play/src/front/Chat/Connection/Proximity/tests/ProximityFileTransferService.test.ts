import type { PrivateSpaceEvent } from "@workadventure/messages";
import { Subject } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import {
    PROXIMITY_FILE_TRANSFER_MAX_FILE_SIZE,
    PROXIMITY_FILE_TRANSFER_MAX_INCOMING_OFFERS_PER_PEER,
    ProximityFileTransferService,
    type ProximityFileTransferSpace,
    type ProximityFileTransferUpdate,
    validateProximityFiles,
} from "../ProximityFileTransferService";
import { encodeProximityFileChunkFrame } from "../ProximityFileTransferProtocol";

const HELLO_SHA256 = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";

function offerEvent(transferId: string, size: number, sender = "sender") {
    return {
        $case: "proximityFileTransferOffer" as const,
        proximityFileTransferOffer: {
            transferId,
            fileName: "f.txt",
            mimeType: "text/plain",
            size,
            messageType: "file",
            characterTextures: [],
            name: undefined,
            sha256: "digest",
        },
        sender: { spaceUserId: sender },
    };
}

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
    });
    const updates: ProximityFileTransferUpdate[] = [];
    const updatesSubscription = service.transferUpdates.subscribe((update) => updates.push(update));
    const handleDataChannelMessage = (data: unknown) =>
        (
            service as unknown as { handleDataChannelMessage(session: unknown, data: unknown): Promise<void> }
        ).handleDataChannelMessage({}, data);
    return { service, incomingOffers, emitPrivateMessage, updates, updatesSubscription, handleDataChannelMessage };
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

describe("ProximityFileTransferService", () => {
    it("should reject incoming chunks beyond the announced transfer size", async () => {
        const { incomingOffers, updates, handleDataChannelMessage } = createService("recipient");
        incomingOffers.next(offerEvent("transfer-1", 0));

        await handleDataChannelMessage(
            JSON.stringify({ type: "proximity_file_start", transferId: "transfer-1", size: 0 }),
        );
        await handleDataChannelMessage(encodeProximityFileChunkFrame("transfer-1", new Uint8Array([1])));

        expect(updates).toContainEqual({
            transferId: "transfer-1",
            state: "error",
            progress: 0,
            error: "file-too-large",
        });
    });

    it("should reject incoming transfers announced above the hard file size cap", async () => {
        const { incomingOffers, updates, handleDataChannelMessage } = createService("recipient");
        const size = PROXIMITY_FILE_TRANSFER_MAX_FILE_SIZE + 1;
        incomingOffers.next(offerEvent("transfer-1", size));

        await handleDataChannelMessage(
            JSON.stringify({ type: "proximity_file_start", transferId: "transfer-1", size }),
        );

        expect(updates).toContainEqual({
            transferId: "transfer-1",
            state: "error",
            progress: 0,
            error: "file-too-large",
        });
    });

    it("should emit one encrypted private offer per recipient", async () => {
        const { service, emitPrivateMessage } = createService("sender");
        const file = new File(["hello"], "hello.txt", { type: "text/plain" });

        const [offer] = await service.createOutgoingOffers([file], ["recipient-1", "sender", "recipient-2"]);

        expect(offer.sha256).toBe(HELLO_SHA256);
        expect(offer.encryptedFile.size).toBeGreaterThan(file.size);
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
            proximityFileTransferOffer: { transferId: offer.transferId, sha256: HELLO_SHA256, size: 5 },
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
