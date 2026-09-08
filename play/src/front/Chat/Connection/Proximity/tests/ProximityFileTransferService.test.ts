import type { PrivateSpaceEvent } from "@workadventure/messages";
import { Subject } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    getMessageTypeFromMimeType,
    PROXIMITY_FILE_TRANSFER_MAX_FILE_SIZE,
    PROXIMITY_FILE_TRANSFER_MAX_INCOMING_OFFERS_PER_PEER,
    ProximityFileTransferService,
    sanitizeProximityFileMimeType,
    type ProximityFileTransferSpace,
    type ProximityFileTransferUpdate,
    validateProximityFiles,
} from "../ProximityFileTransferService";
import { encodeProximityFileChunkFrame } from "../ProximityFileTransferProtocol";
import {
    exportProximityFileEncryptionKey,
    generateProximityFileEncryptionKey,
    ProximityFileStreamEncryptor,
} from "../ProximityFileTransferSecurity";

const HELLO_SHA256 = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";

function offerEvent(transferId: string, size: number, sender = "sender", sha256 = "digest", mimeType = "text/plain") {
    return {
        $case: "proximityFileTransferOffer" as const,
        proximityFileTransferOffer: {
            transferId,
            fileName: "f.txt",
            mimeType,
            size,
            characterTextures: [],
            name: undefined,
            sha256,
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

/** Encrypts `content` the way a sender does and returns the messages a receiver would get. */
async function encryptedTransfer(transferId: string, content: string) {
    const key = await generateProximityFileEncryptionKey();
    const encryptor = await ProximityFileStreamEncryptor.create(key);
    const keyMessage = JSON.stringify({
        type: "proximity_file_key",
        transferId,
        rawKey: await exportProximityFileEncryptionKey(key),
        iv: encryptor.iv,
    });
    const frames: Uint8Array<ArrayBuffer>[] = [];
    for await (const frame of encryptor.frames(new Blob([content]))) {
        frames.push(frame);
    }
    return { keyMessage, bytes: new Uint8Array(await new Blob(frames).arrayBuffer()) };
}

function startMessage(transferId: string, size: number) {
    return JSON.stringify({ type: "proximity_file_start", transferId, size });
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

describe("sanitizeProximityFileMimeType", () => {
    it("should keep inline-safe types and downgrade everything else to a plain download", () => {
        expect(sanitizeProximityFileMimeType("image/png")).toBe("image/png");
        expect(sanitizeProximityFileMimeType("Image/PNG; charset=binary")).toBe("image/png");
        expect(sanitizeProximityFileMimeType("image/svg+xml")).toBe("application/octet-stream");
        expect(sanitizeProximityFileMimeType("text/html")).toBe("application/octet-stream");
        expect(getMessageTypeFromMimeType(sanitizeProximityFileMimeType("image/svg+xml"))).toBe("file");
    });
});

describe("ProximityFileTransferService", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("should stream an encrypted file from a sender to a receiver", async () => {
        const createObjectURL = vi.fn().mockReturnValue("blob:received");
        vi.stubGlobal("URL", { createObjectURL });
        const sender = createService("sender");
        const receiver = createService("recipient");
        const file = new File(["hello"], "hello.txt", { type: "text/plain" });
        const [offer] = await sender.service.createOutgoingOffers([file], ["recipient"]);
        receiver.incomingOffers.next(offerEvent(offer.transferId, file.size, "sender", offer.sha256, file.type));
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
        const { keyMessage, bytes } = await encryptedTransfer("transfer-1", "hello");
        incomingOffers.next(offerEvent("transfer-1", 5, "sender", HELLO_SHA256, "image/svg+xml"));

        await handleDataChannelMessage(keyMessage);
        await handleDataChannelMessage(startMessage("transfer-1", bytes.byteLength));
        await handleDataChannelMessage(encodeProximityFileChunkFrame("transfer-1", bytes));
        await handleDataChannelMessage(JSON.stringify({ type: "proximity_file_complete", transferId: "transfer-1" }));

        expect((createObjectURL.mock.calls[0]?.[0] as Blob).type).toBe("application/octet-stream");
    });

    it("should decrypt a transfer whose frames straddle chunk boundaries", async () => {
        const createObjectURL = vi.fn().mockReturnValue("blob:transfer-1");
        vi.stubGlobal("URL", { createObjectURL });
        const { incomingOffers, updates, handleDataChannelMessage } = createService("recipient");
        const { keyMessage, bytes } = await encryptedTransfer("transfer-1", "hello");
        incomingOffers.next(offerEvent("transfer-1", 5, "sender", HELLO_SHA256));

        await handleDataChannelMessage(keyMessage);
        await handleDataChannelMessage(startMessage("transfer-1", bytes.byteLength));
        for (let offset = 0; offset < bytes.byteLength; offset += 7) {
            // eslint-disable-next-line no-await-in-loop -- chunks are delivered in order
            await handleDataChannelMessage(
                encodeProximityFileChunkFrame("transfer-1", bytes.subarray(offset, offset + 7)),
            );
        }
        await handleDataChannelMessage(JSON.stringify({ type: "proximity_file_complete", transferId: "transfer-1" }));

        expect(updates.at(-1)).toMatchObject({ transferId: "transfer-1", state: "ready" });
        expect(await (createObjectURL.mock.calls[0]?.[0] as Blob).text()).toBe("hello");
    });

    it("should ignore an offer re-emitted by another peer with a known transfer id", () => {
        const { service, incomingOffers, updates } = createService("recipient");
        const surfaced: string[] = [];
        const subscription = service.incomingOffers.subscribe((offer) => surfaced.push(offer.senderSpaceUserId));
        incomingOffers.next(offerEvent("transfer-1", 5, "sender", "sender-hash"));

        incomingOffers.next(offerEvent("transfer-1", 5, "attacker", "attacker-hash"));

        expect(surfaced).toEqual(["sender"]);
        expect(updates).toHaveLength(1);
        subscription.unsubscribe();
    });

    it("should ignore data channel messages about a transfer from a peer that did not offer it", async () => {
        const { incomingOffers, updates, handleDataChannelMessage } = createService("recipient");
        const { keyMessage, bytes } = await encryptedTransfer("transfer-1", "hello");
        incomingOffers.next(offerEvent("transfer-1", 5, "sender", HELLO_SHA256));

        await handleDataChannelMessage(keyMessage, "attacker");
        await handleDataChannelMessage(startMessage("transfer-1", bytes.byteLength), "attacker");
        await handleDataChannelMessage(encodeProximityFileChunkFrame("transfer-1", bytes), "attacker");
        await handleDataChannelMessage(
            JSON.stringify({ type: "proximity_file_error", transferId: "transfer-1", reason: "unavailable" }),
            "attacker",
        );

        expect(updates).toEqual([{ transferId: "transfer-1", state: "pending", progress: 0 }]);
    });

    it("should reject a transfer whose plaintext hash does not match the offer", async () => {
        vi.stubGlobal("URL", { createObjectURL: vi.fn() });
        const { incomingOffers, updates, handleDataChannelMessage } = createService("recipient");
        const { keyMessage, bytes } = await encryptedTransfer("transfer-1", "hello");
        incomingOffers.next(offerEvent("transfer-1", 5, "sender", "not-the-hash"));

        await handleDataChannelMessage(keyMessage);
        await handleDataChannelMessage(startMessage("transfer-1", bytes.byteLength));
        await handleDataChannelMessage(encodeProximityFileChunkFrame("transfer-1", bytes));
        await handleDataChannelMessage(JSON.stringify({ type: "proximity_file_complete", transferId: "transfer-1" }));

        expect(updates.at(-1)).toMatchObject({
            transferId: "transfer-1",
            state: "error",
            error: "integrity-check-failed",
        });
    });

    it("should reject a start message that arrives before the encryption key", async () => {
        const { incomingOffers, updates, handleDataChannelMessage } = createService("recipient");
        incomingOffers.next(offerEvent("transfer-1", 5));

        await handleDataChannelMessage(startMessage("transfer-1", 5));

        expect(updates.at(-1)).toMatchObject({ transferId: "transfer-1", state: "error", error: "missing-key" });
    });

    it("should reject incoming chunks beyond the announced transfer size", async () => {
        const { incomingOffers, updates, handleDataChannelMessage } = createService("recipient");
        const { keyMessage } = await encryptedTransfer("transfer-1", "");
        incomingOffers.next(offerEvent("transfer-1", 0));

        await handleDataChannelMessage(keyMessage);
        await handleDataChannelMessage(startMessage("transfer-1", 0));
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

        await handleDataChannelMessage(startMessage("transfer-1", size));

        expect(updates).toContainEqual({
            transferId: "transfer-1",
            state: "error",
            progress: 0,
            error: "file-too-large",
        });
    });

    it("should emit one private offer per recipient", async () => {
        const { service, emitPrivateMessage } = createService("sender");
        const file = new File(["hello"], "hello.txt", { type: "text/plain" });

        const [offer] = await service.createOutgoingOffers([file], ["recipient-1", "sender", "recipient-2"]);

        expect(offer.sha256).toBe(HELLO_SHA256);
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
