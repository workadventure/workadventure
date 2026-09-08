import type { ProximityFileTransferOfferMessage } from "@workadventure/messages";
import type { Observable } from "rxjs";
import { Subject, Subscription } from "rxjs";
import { v4 as uuidv4 } from "uuid";
import type { SpaceInterface } from "../../../Space/SpaceInterface";
import { ProximityFileStorage } from "./ProximityFileStorage";
import {
    decodeProximityFileChunkFrame,
    decodeProximityFileControlMessage,
    encodeProximityFileChunkFrame,
    type ProximityFileTransferControlMessage,
} from "./ProximityFileTransferProtocol";
import {
    exportProximityFileEncryptionKey,
    generateProximityFileEncryptionKey,
    getEncryptedTransferWireSize,
    hashProximityFileBlob,
    importProximityFileEncryptionKey,
    ProximityFileStreamDecryptor,
    ProximityFileStreamEncryptor,
    type ProximityFileTransferEncryptionKey,
    type ProximityFileTransferEncryptionMetadata,
} from "./ProximityFileTransferSecurity";

export const PROXIMITY_FILE_TRANSFER_MAX_FILES = 3;
// Maximum allowed size for a proximity file transfer: 100 MB.
// The receiving side buffers the whole transfer in memory before assembling the
// blob, so this cap protects recipients from out-of-memory crashes triggered by
// an oversized (or malicious) transfer.
export const PROXIMITY_FILE_TRANSFER_MAX_FILE_SIZE = 100 * 1024 * 1024;
// Upper bound on undownloaded offers a single peer may have pending at once. Offers are
// remote-controlled (each surfaces a chat message + notification), so this throttles a peer
// from flooding the recipient with offers and growing the incomingTransfers map unbounded.
export const PROXIMITY_FILE_TRANSFER_MAX_INCOMING_OFFERS_PER_PEER = 20;
const PROXIMITY_FILE_TRANSFER_CHUNK_SIZE = 64 * 1024;
const PROXIMITY_FILE_TRANSFER_BUFFERED_AMOUNT_LOW_THRESHOLD = 256 * 1024;
const PROXIMITY_FILE_TRANSFER_NEGOTIATION_TIMEOUT = 15_000;

export type ProximityFileValidationResult = { ok: true } | { ok: false; reason: "too-many-files" | "file-too-large" };

export function validateProximityFiles(files: File[]): ProximityFileValidationResult {
    if (files.length > PROXIMITY_FILE_TRANSFER_MAX_FILES) {
        return { ok: false, reason: "too-many-files" };
    }

    if (files.some((file) => file.size > PROXIMITY_FILE_TRANSFER_MAX_FILE_SIZE)) {
        return { ok: false, reason: "file-too-large" };
    }

    return { ok: true };
}

export type IncomingProximityFileTransferOffer = ProximityFileTransferOfferMessage & {
    senderSpaceUserId: string;
};

export type ProximityFileTransferUpdate =
    | {
          transferId: string;
          state: "pending" | "connecting" | "downloading";
          progress: number;
      }
    | {
          transferId: string;
          state: "ready";
          progress: 1;
          url: string;
      }
    | {
          transferId: string;
          state: "error";
          progress: number;
          error: string;
      };

export type ProximityFileTransferOffer = {
    transferId: string;
    file: File;
    messageType: "file" | "image" | "audio" | "video";
    recipients: string[];
    sha256: string;
    encryptionKey: ProximityFileTransferEncryptionKey;
};

type ProximityFileTransferSignalPayload =
    | {
          type: "description";
          description: RTCSessionDescriptionInit;
      }
    | {
          type: "candidate";
          candidate: RTCIceCandidateInit;
      };

type ProximityFileTransferSignalMessage = { transferId: string; connectionId: string; signal: string };

export type ProximityFileTransferSpace = Pick<SpaceInterface, "emitPrivateMessage" | "observePrivateEvent">;

export type ProximityFileTransferServiceOptions = {
    localSpaceUserId: string;
    space: ProximityFileTransferSpace;
    getIceServers: () => Promise<RTCIceServer[]>;
    canExchangeWith: (spaceUserId: string) => boolean;
};

type PeerSession = {
    remoteSpaceUserId: string;
    connectionId: string;
    peerConnection: RTCPeerConnection;
    dataChannel: RTCDataChannel | undefined;
    openPromise: Promise<RTCDataChannel>;
    resolveOpen: (dataChannel: RTCDataChannel) => void;
    rejectOpen: (error: Error) => void;
    // Inbound messages are processed one at a time so the key always lands before the start
    // message that needs it; outbound transfers to the same peer are sent one after the other.
    inboundQueue: Promise<void>;
    outboundQueue: Promise<void>;
    negotiationTimeout: ReturnType<typeof setTimeout>;
    signalTransferId: string;
    canEmitCandidates: boolean;
    pendingCandidates: RTCIceCandidateInit[];
};

type ReceivingTransfer = {
    offer: IncomingProximityFileTransferOffer;
    expectedBytes: number;
    receivedBytes: number;
    decryptor: ProximityFileStreamDecryptor;
};

type IncomingProximityFileEncryption = {
    key: ProximityFileTransferEncryptionKey;
    metadata: ProximityFileTransferEncryptionMetadata;
};

export class ProximityFileTransferService {
    private readonly outgoingTransfers = new Map<string, ProximityFileTransferOffer>();
    private readonly incomingTransfers = new Map<string, IncomingProximityFileTransferOffer>();
    private readonly receivingTransfers = new Map<string, ReceivingTransfer>();
    private readonly incomingEncryption = new Map<string, IncomingProximityFileEncryption>();
    private readonly peerSessions = new Map<string, PeerSession>();
    private readonly storage = new ProximityFileStorage();
    private readonly subscriptions = new Subscription();
    private readonly incomingOfferSubject = new Subject<IncomingProximityFileTransferOffer>();
    public readonly incomingOffers: Observable<IncomingProximityFileTransferOffer> = this.incomingOfferSubject;
    private readonly transferUpdateSubject = new Subject<ProximityFileTransferUpdate>();
    public readonly transferUpdates: Observable<ProximityFileTransferUpdate> = this.transferUpdateSubject;

    constructor(private readonly options: ProximityFileTransferServiceOptions) {
        this.subscriptions.add(
            this.options.space.observePrivateEvent("proximityFileTransferOffer").subscribe((event) => {
                const senderSpaceUserId = event.sender.spaceUserId;
                if (senderSpaceUserId === this.options.localSpaceUserId) {
                    return;
                }
                const offer = {
                    ...event.proximityFileTransferOffer,
                    senderSpaceUserId,
                };
                // Throttle a peer that floods us with offers. Re-offering a known transferId just
                // refreshes it (the count is per distinct transferId), so legitimate retries are fine.
                if (
                    !this.incomingTransfers.has(offer.transferId) &&
                    this.countIncomingOffersFromSender(senderSpaceUserId) >=
                        PROXIMITY_FILE_TRANSFER_MAX_INCOMING_OFFERS_PER_PEER
                ) {
                    return;
                }
                this.incomingTransfers.set(offer.transferId, offer);
                this.transferUpdateSubject.next({ transferId: offer.transferId, state: "pending", progress: 0 });
                this.incomingOfferSubject.next(offer);
            }),
        );
        // Free the per-peer offer slot once a download finishes, so completing transfers do not
        // count against the cap.
        this.subscriptions.add(
            this.transferUpdateSubject.subscribe((update) => {
                if (update.state === "ready") {
                    this.incomingTransfers.delete(update.transferId);
                }
            }),
        );
        this.subscriptions.add(
            this.options.space.observePrivateEvent("proximityFileTransferSignal").subscribe((event) => {
                this.handleSignal(event.sender.spaceUserId, event.proximityFileTransferSignal).catch((error) => {
                    console.error("Error while handling proximity file transfer signal", error);
                });
            }),
        );
    }

    async createOutgoingOffers(files: File[], recipients: string[]): Promise<ProximityFileTransferOffer[]> {
        const validation = validateProximityFiles(files);
        if (!validation.ok) {
            throw new Error(validation.reason);
        }

        const recipientIds = recipients.filter((spaceUserId) => spaceUserId !== this.options.localSpaceUserId);
        const offers = await Promise.all(files.map((file) => this.createOutgoingOffer(file, recipientIds)));

        for (const offer of offers) {
            this.outgoingTransfers.set(offer.transferId, offer);
            for (const recipientId of recipientIds) {
                this.options.space.emitPrivateMessage(
                    {
                        $case: "proximityFileTransferOffer",
                        proximityFileTransferOffer: {
                            transferId: offer.transferId,
                            fileName: offer.file.name,
                            mimeType: offer.file.type,
                            size: offer.file.size,
                            messageType: offer.messageType,
                            characterTextures: [],
                            name: undefined,
                            sha256: offer.sha256,
                        },
                    },
                    recipientId,
                );
            }
        }
        return offers;
    }

    // The file itself stays on disk (a File is not loaded in memory); it is read, encrypted and
    // sent slice by slice each time a recipient requests it.
    private async createOutgoingOffer(file: File, recipients: string[]): Promise<ProximityFileTransferOffer> {
        return {
            transferId: uuidv4(),
            file,
            messageType: getMessageTypeFromFile(file),
            recipients,
            sha256: await hashProximityFileBlob(file),
            encryptionKey: await generateProximityFileEncryptionKey(),
        };
    }

    async download(transferId: string): Promise<void> {
        const offer = this.incomingTransfers.get(transferId);
        if (!offer) {
            throw new Error("Unknown proximity file transfer");
        }

        this.transferUpdateSubject.next({ transferId, state: "connecting", progress: 0 });
        const session = await this.ensureInitiatorPeerSession(offer.senderSpaceUserId, transferId);
        const dataChannel = await session.openPromise;
        this.sendControlMessage(dataChannel, { type: "proximity_file_request", transferId });
    }

    destroy(): void {
        this.subscriptions.unsubscribe();
        this.incomingOfferSubject.complete();
        this.transferUpdateSubject.complete();
        this.outgoingTransfers.clear();
        this.incomingTransfers.clear();
        this.receivingTransfers.clear();
        this.incomingEncryption.clear();
        this.storage.destroy().catch((error) => console.warn("Unable to clean up proximity file storage", error));
        for (const session of this.peerSessions.values()) {
            clearTimeout(session.negotiationTimeout);
            session.dataChannel?.close();
            session.peerConnection.close();
        }
        this.peerSessions.clear();
    }

    private async ensureInitiatorPeerSession(remoteSpaceUserId: string, transferId: string): Promise<PeerSession> {
        const existingSession = this.peerSessions.get(remoteSpaceUserId);
        if (existingSession) {
            return existingSession;
        }

        const session = await this.createPeerSession(remoteSpaceUserId, uuidv4());
        const dataChannel = session.peerConnection.createDataChannel("proximity-file-transfer");
        this.bindDataChannel(session, dataChannel);
        this.peerSessions.set(remoteSpaceUserId, session);

        const offer = await session.peerConnection.createOffer();
        await session.peerConnection.setLocalDescription(offer);
        this.emitSignal(remoteSpaceUserId, transferId, session.connectionId, {
            type: "description",
            description: offer,
        });
        this.enableCandidateEmission(session, transferId);

        return session;
    }

    private async createPeerSession(remoteSpaceUserId: string, connectionId: string): Promise<PeerSession> {
        const peerConnection = new RTCPeerConnection({ iceServers: await this.options.getIceServers() });
        let resolveOpen!: (dataChannel: RTCDataChannel) => void;
        let rejectOpen!: (error: Error) => void;
        const openPromise = new Promise<RTCDataChannel>((resolve, reject) => {
            resolveOpen = resolve;
            rejectOpen = reject;
        });
        const session: PeerSession = {
            remoteSpaceUserId,
            connectionId,
            peerConnection,
            dataChannel: undefined,
            openPromise,
            resolveOpen,
            rejectOpen,
            inboundQueue: Promise.resolve(),
            outboundQueue: Promise.resolve(),
            signalTransferId: "",
            canEmitCandidates: false,
            pendingCandidates: [],
            negotiationTimeout: setTimeout(() => {
                rejectOpen(new Error("Proximity file transfer connection timeout"));
                this.closePeerSession(remoteSpaceUserId);
            }, PROXIMITY_FILE_TRANSFER_NEGOTIATION_TIMEOUT),
        };

        peerConnection.onicecandidate = (event) => {
            if (!event.candidate) {
                return;
            }
            const candidate = event.candidate.toJSON();
            if (!session.canEmitCandidates) {
                session.pendingCandidates.push(candidate);
                return;
            }
            this.emitSignal(remoteSpaceUserId, session.signalTransferId, connectionId, {
                type: "candidate",
                candidate,
            });
        };
        peerConnection.ondatachannel = (event) => {
            this.bindDataChannel(session, event.channel);
        };
        peerConnection.onconnectionstatechange = () => {
            if (peerConnection.connectionState === "failed" || peerConnection.connectionState === "closed") {
                this.closePeerSession(remoteSpaceUserId);
            }
        };
        return session;
    }

    private bindDataChannel(session: PeerSession, dataChannel: RTCDataChannel): void {
        dataChannel.binaryType = "arraybuffer";
        dataChannel.bufferedAmountLowThreshold = PROXIMITY_FILE_TRANSFER_BUFFERED_AMOUNT_LOW_THRESHOLD;
        session.dataChannel = dataChannel;
        dataChannel.onopen = () => {
            clearTimeout(session.negotiationTimeout);
            session.resolveOpen(dataChannel);
        };
        dataChannel.onerror = () => {
            session.rejectOpen(new Error("Proximity file transfer data channel error"));
        };
        dataChannel.onmessage = (event) => {
            session.inboundQueue = session.inboundQueue
                .then(() => this.handleDataChannelMessage(session, event.data))
                .catch((error) => {
                    console.error("Error while handling proximity file transfer data channel message", error);
                });
        };
        dataChannel.onclose = () => {
            this.closePeerSession(session.remoteSpaceUserId);
        };
    }

    private async handleSignal(
        senderSpaceUserId: string,
        signalMessage: ProximityFileTransferSignalMessage,
    ): Promise<void> {
        if (!this.options.canExchangeWith(senderSpaceUserId)) {
            return;
        }

        const signal = JSON.parse(signalMessage.signal) as ProximityFileTransferSignalPayload;
        let session = this.peerSessions.get(senderSpaceUserId);

        if (signal.type === "description" && signal.description.type === "offer") {
            // A new negotiation supersedes any existing session for this peer. Close the
            // previous one first so we don't leak its RTCPeerConnection and negotiation timer
            // (a remote peer could otherwise force unbounded allocations by replaying offers).
            this.closePeerSession(senderSpaceUserId);
            session = await this.createPeerSession(senderSpaceUserId, signalMessage.connectionId);
            this.peerSessions.set(senderSpaceUserId, session);
            await session.peerConnection.setRemoteDescription(signal.description);
            const answer = await session.peerConnection.createAnswer();
            await session.peerConnection.setLocalDescription(answer);
            this.emitSignal(senderSpaceUserId, signalMessage.transferId, session.connectionId, {
                type: "description",
                description: answer,
            });
            this.enableCandidateEmission(session, signalMessage.transferId);
            return;
        }

        if (!session || session.connectionId !== signalMessage.connectionId) {
            return;
        }

        if (signal.type === "description") {
            await session.peerConnection.setRemoteDescription(signal.description);
            return;
        }

        await session.peerConnection.addIceCandidate(signal.candidate);
    }

    private async handleDataChannelMessage(session: PeerSession, data: unknown): Promise<void> {
        if (typeof data === "string") {
            const message = decodeProximityFileControlMessage(data);
            switch (message.type) {
                case "proximity_file_request": {
                    await this.enqueueOutgoingTransfer(session, message.transferId);
                    break;
                }
                case "proximity_file_key": {
                    this.incomingEncryption.set(message.transferId, {
                        key: await importProximityFileEncryptionKey(message.rawKey),
                        metadata: { algorithm: "XCHACHA20-POLY1305", iv: message.iv, mimeType: message.mimeType },
                    });
                    break;
                }
                case "proximity_file_start": {
                    const offer = this.incomingTransfers.get(message.transferId);
                    if (!offer) {
                        return;
                    }
                    const expectedBytes = this.validateIncomingTransferSize(message.transferId, offer, message.size);
                    if (expectedBytes === undefined) {
                        return;
                    }
                    const encryption = this.incomingEncryption.get(message.transferId);
                    if (!encryption) {
                        this.failReceivingTransfer(message.transferId, "missing-key");
                        return;
                    }
                    this.receivingTransfers.set(message.transferId, {
                        offer,
                        expectedBytes,
                        receivedBytes: 0,
                        decryptor: await ProximityFileStreamDecryptor.create(
                            encryption.key,
                            encryption.metadata,
                            await this.storage.createSink(message.transferId),
                        ),
                    });
                    this.transferUpdateSubject.next({
                        transferId: message.transferId,
                        state: "downloading",
                        progress: 0,
                    });
                    break;
                }
                case "proximity_file_complete": {
                    await this.completeReceivingTransfer(message.transferId);
                    break;
                }
                case "proximity_file_error": {
                    this.transferUpdateSubject.next({
                        transferId: message.transferId,
                        state: "error",
                        progress: 0,
                        error: message.reason,
                    });
                    break;
                }
                default: {
                    const _exhaustiveCheck: never = message;
                }
            }
            return;
        }

        const frame = decodeProximityFileChunkFrame(data as ArrayBuffer | ArrayBufferView);
        const receivingTransfer = this.receivingTransfers.get(frame.transferId);
        if (!receivingTransfer) {
            return;
        }
        const nextReceivedBytes = receivingTransfer.receivedBytes + frame.chunk.byteLength;
        if (
            nextReceivedBytes > receivingTransfer.expectedBytes ||
            nextReceivedBytes > PROXIMITY_FILE_TRANSFER_MAX_FILE_SIZE
        ) {
            this.failReceivingTransfer(frame.transferId, "file-too-large");
            return;
        }
        try {
            await receivingTransfer.decryptor.push(frame.chunk);
        } catch {
            this.failReceivingTransfer(frame.transferId, "integrity-check-failed");
            return;
        }
        receivingTransfer.receivedBytes = nextReceivedBytes;
        this.transferUpdateSubject.next({
            transferId: frame.transferId,
            state: "downloading",
            progress: Math.min(receivingTransfer.receivedBytes / Math.max(receivingTransfer.expectedBytes, 1), 1),
        });
    }

    private enqueueOutgoingTransfer(session: PeerSession, transferId: string): Promise<void> {
        session.outboundQueue = session.outboundQueue.then(() => this.sendOutgoingTransfer(session, transferId));
        return session.outboundQueue;
    }

    private async sendOutgoingTransfer(session: PeerSession, transferId: string): Promise<void> {
        const transfer = this.outgoingTransfers.get(transferId);
        const dataChannel = session.dataChannel;
        if (
            !transfer ||
            !dataChannel ||
            !transfer.recipients.includes(session.remoteSpaceUserId) ||
            !this.options.canExchangeWith(session.remoteSpaceUserId)
        ) {
            if (dataChannel) {
                this.sendControlMessage(dataChannel, {
                    type: "proximity_file_error",
                    transferId,
                    reason: "unavailable",
                });
            }
            return;
        }

        const encryptor = await ProximityFileStreamEncryptor.create(transfer.encryptionKey, transfer.file.type);
        this.sendControlMessage(dataChannel, {
            type: "proximity_file_key",
            transferId,
            rawKey: await exportProximityFileEncryptionKey(transfer.encryptionKey),
            iv: encryptor.metadata.iv,
            mimeType: encryptor.metadata.mimeType,
        });
        this.sendControlMessage(dataChannel, {
            type: "proximity_file_start",
            transferId,
            size: getEncryptedTransferWireSize(transfer.file.size),
        });

        try {
            for await (const frame of encryptor.frames(transfer.file)) {
                for (let offset = 0; offset < frame.byteLength; offset += PROXIMITY_FILE_TRANSFER_CHUNK_SIZE) {
                    dataChannel.send(
                        encodeProximityFileChunkFrame(
                            transferId,
                            frame.subarray(offset, offset + PROXIMITY_FILE_TRANSFER_CHUNK_SIZE),
                        ),
                    );
                    // eslint-disable-next-line no-await-in-loop -- chunks must be sent in order
                    await this.waitForBackpressure(dataChannel);
                }
            }
        } catch (error) {
            // Typically the file changed or vanished on disk since the offer was made.
            console.error("Error while sending proximity file transfer", error);
            this.sendControlMessage(dataChannel, { type: "proximity_file_error", transferId, reason: "unavailable" });
            return;
        }

        this.sendControlMessage(dataChannel, { type: "proximity_file_complete", transferId });
    }

    private async completeReceivingTransfer(transferId: string): Promise<void> {
        const receivingTransfer = this.receivingTransfers.get(transferId);
        if (!receivingTransfer) {
            return;
        }
        let decrypted: { blob: Blob; sha256: string };
        try {
            decrypted = await receivingTransfer.decryptor.finish();
        } catch {
            this.failReceivingTransfer(transferId, "integrity-check-failed");
            return;
        }
        if (
            decrypted.blob.size !== receivingTransfer.offer.size ||
            decrypted.sha256 !== receivingTransfer.offer.sha256
        ) {
            this.failReceivingTransfer(transferId, "integrity-check-failed");
            return;
        }
        this.receivingTransfers.delete(transferId);
        this.incomingEncryption.delete(transferId);
        this.transferUpdateSubject.next({
            transferId,
            state: "ready",
            progress: 1,
            url: URL.createObjectURL(decrypted.blob),
        });
    }

    private validateIncomingTransferSize(
        transferId: string,
        offer: IncomingProximityFileTransferOffer,
        announcedSize: number,
    ): number | undefined {
        const offerSize = offer.size;
        if (
            !Number.isFinite(offerSize) ||
            offerSize < 0 ||
            offerSize > PROXIMITY_FILE_TRANSFER_MAX_FILE_SIZE ||
            !Number.isFinite(announcedSize) ||
            announcedSize < 0 ||
            announcedSize > getEncryptedTransferWireSize(offerSize)
        ) {
            this.failReceivingTransfer(transferId, "file-too-large");
            return undefined;
        }
        return announcedSize;
    }

    private failReceivingTransfer(transferId: string, error: string): void {
        this.receivingTransfers
            .get(transferId)
            ?.decryptor.discard()
            .catch((discardError) => console.warn("Unable to discard proximity file transfer", discardError));
        this.receivingTransfers.delete(transferId);
        this.transferUpdateSubject.next({
            transferId,
            state: "error",
            progress: 0,
            error,
        });
    }

    private waitForBackpressure(dataChannel: RTCDataChannel): Promise<void> {
        if (dataChannel.bufferedAmount <= PROXIMITY_FILE_TRANSFER_BUFFERED_AMOUNT_LOW_THRESHOLD) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            dataChannel.addEventListener("bufferedamountlow", () => resolve(), { once: true });
        });
    }

    private sendControlMessage(dataChannel: RTCDataChannel, message: ProximityFileTransferControlMessage): void {
        dataChannel.send(JSON.stringify(message));
    }

    private emitSignal(
        receiverSpaceUserId: string,
        transferId: string,
        connectionId: string,
        signal: ProximityFileTransferSignalPayload,
    ): void {
        this.options.space.emitPrivateMessage(
            {
                $case: "proximityFileTransferSignal",
                proximityFileTransferSignal: {
                    transferId,
                    connectionId,
                    signal: JSON.stringify(signal),
                },
            },
            receiverSpaceUserId,
        );
    }

    private enableCandidateEmission(session: PeerSession, transferId: string): void {
        session.signalTransferId = transferId;
        session.canEmitCandidates = true;
        for (const candidate of session.pendingCandidates.splice(0)) {
            this.emitSignal(session.remoteSpaceUserId, transferId, session.connectionId, {
                type: "candidate",
                candidate,
            });
        }
    }

    private closePeerSession(remoteSpaceUserId: string): void {
        const session = this.peerSessions.get(remoteSpaceUserId);
        if (!session) {
            return;
        }
        this.peerSessions.delete(remoteSpaceUserId);
        clearTimeout(session.negotiationTimeout);
        session.dataChannel?.close();
        session.peerConnection.close();
    }

    private countIncomingOffersFromSender(senderSpaceUserId: string): number {
        let count = 0;
        for (const offer of this.incomingTransfers.values()) {
            if (offer.senderSpaceUserId === senderSpaceUserId) {
                count++;
            }
        }
        return count;
    }
}

export function getMessageTypeFromFile(file: File): "file" | "image" | "audio" | "video" {
    if (file.type.startsWith("image/")) {
        return "image";
    }
    if (file.type.startsWith("audio/")) {
        return "audio";
    }
    if (file.type.startsWith("video/")) {
        return "video";
    }
    return "file";
}
