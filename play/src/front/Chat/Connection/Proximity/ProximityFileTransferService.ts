import type { PrivateSpaceEvent, ProximityFileTransferOfferMessage } from "@workadventure/messages";
import type { Observable } from "rxjs";
import { Subject, Subscription } from "rxjs";
import { v4 as uuidv4 } from "uuid";
import type {
    IncomingProximityFileTransferOffer,
    ProximityFileTransferUpdate,
    ProximityFileTransferTransport,
} from "./ProximityFileTransferTransport";
import {
    decodeProximityFileChunkFrame,
    decodeProximityFileControlMessage,
    encodeProximityFileChunkFrame,
    encodeProximityFileControlMessage,
} from "./ProximityFileTransferProtocol";
import {
    decryptProximityFileBlob,
    encryptProximityFileBlob,
    exportProximityFileEncryptionKey,
    generateProximityFileEncryptionKey,
    hashProximityFileBlob,
    importProximityFileEncryptionKey,
    type ProximityFileTransferEncryptionKey,
    type ProximityFileTransferEncryptionMetadata,
} from "./ProximityFileTransferSecurity";

export const PROXIMITY_FILE_TRANSFER_MAX_FILES = 3;
// Maximum allowed size for a proximity file transfer: 100 MB.
// The receiving side buffers the whole transfer in memory before assembling the
// blob, so this cap protects recipients from out-of-memory crashes triggered by
// an oversized (or malicious) transfer.
export const PROXIMITY_FILE_TRANSFER_MAX_FILE_SIZE = 100 * 1024 * 1024;
const PROXIMITY_FILE_TRANSFER_CHUNK_SIZE = 64 * 1024;
const PROXIMITY_FILE_TRANSFER_ENCRYPTED_CHUNK_SIZE = 1024 * 1024;
const PROXIMITY_FILE_TRANSFER_ENCRYPTED_CHUNK_OVERHEAD = 21;
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

export const ENABLE_PROXIMITY_FILE_TRANSFER_SECURITY = false;

export function isProximityFileTransferSecurityEnabled(): boolean {
    return ENABLE_PROXIMITY_FILE_TRANSFER_SECURITY;
}

type ProximityFileTransferBackpressureDataChannel = {
    readonly bufferedAmount: number;
    bufferedAmountLowThreshold: number;
    addEventListener: EventTarget["addEventListener"];
    removeEventListener: EventTarget["removeEventListener"];
};

export function waitForProximityFileTransferBackpressure(
    dataChannel: ProximityFileTransferBackpressureDataChannel,
): Promise<void> {
    dataChannel.bufferedAmountLowThreshold = PROXIMITY_FILE_TRANSFER_BUFFERED_AMOUNT_LOW_THRESHOLD;

    if (dataChannel.bufferedAmount <= PROXIMITY_FILE_TRANSFER_BUFFERED_AMOUNT_LOW_THRESHOLD) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const resolveWhenReady = () => {
            if (dataChannel.bufferedAmount > PROXIMITY_FILE_TRANSFER_BUFFERED_AMOUNT_LOW_THRESHOLD) {
                return;
            }

            dataChannel.removeEventListener("bufferedamountlow", resolveWhenReady);
            resolve();
        };

        dataChannel.addEventListener("bufferedamountlow", resolveWhenReady);
        resolveWhenReady();
    });
}

export type ProximityFileTransferRecipient = {
    spaceUserId: string;
};

export type ProximityFileTransferOffer = {
    transferId: string;
    file: File;
    messageType: "file" | "image" | "audio" | "video";
    recipients: string[];
    sha256?: string;
    encryptionAlgorithm?: "XCHACHA20-POLY1305";
    encryptionKeyId?: string;
    encryptedFile?: File;
    encryptionKey?: ProximityFileTransferEncryptionKey;
    encryptionMetadata?: ProximityFileTransferEncryptionMetadata;
};

export type { IncomingProximityFileTransferOffer, ProximityFileTransferTransport };

export type { ProximityFileTransferUpdate };

type ProximityFileTransferSignalPayload =
    | {
          type: "description";
          description: RTCSessionDescriptionInit;
      }
    | {
          type: "candidate";
          candidate: RTCIceCandidateInit;
      };

type PrivateEventsObservables = {
    proximityFileTransferOffer: Subject<
        {
            $case: "proximityFileTransferOffer";
            proximityFileTransferOffer: ProximityFileTransferOfferMessage;
            sender: { spaceUserId: string } | string;
        } & Record<string, unknown>
    >;
    proximityFileTransferSignal: Subject<
        {
            $case: "proximityFileTransferSignal";
            proximityFileTransferSignal: { transferId: string; connectionId: string; signal: string };
            sender: { spaceUserId: string } | string;
        } & Record<string, unknown>
    >;
};

export type ProximityFileTransferSpace = {
    emitPrivateMessage(message: NonNullable<PrivateSpaceEvent["event"]>, receiverUserId: string): void;
    observePrivateEvent<K extends keyof PrivateEventsObservables>(key: K): PrivateEventsObservables[K];
};

export type ProximityFileTransferServiceOptions = {
    localSpaceUserId: string;
    space: ProximityFileTransferSpace;
    getIceServers?: () => Promise<RTCIceServer[]>;
    createPeerConnection?: (configuration: RTCConfiguration) => RTCPeerConnection;
    canExchangeWith?: (spaceUserId: string) => boolean;
    isSecurityEnabled?: () => boolean;
    transferTransport?: ProximityFileTransferTransport;
    getTransferTransport?: () => ProximityFileTransferTransport | undefined;
};

type PeerSession = {
    remoteSpaceUserId: string;
    connectionId: string;
    peerConnection: RTCPeerConnection;
    dataChannel: RTCDataChannel | undefined;
    openPromise: Promise<RTCDataChannel>;
    resolveOpen: (dataChannel: RTCDataChannel) => void;
    rejectOpen: (error: Error) => void;
    queue: Promise<void>;
    negotiationTimeout: ReturnType<typeof setTimeout>;
    signalTransferId: string;
    canEmitCandidates: boolean;
    pendingCandidates: RTCIceCandidateInit[];
};

type ReceivingTransfer = {
    offer: IncomingProximityFileTransferOffer;
    expectedBytes: number;
    chunks: Uint8Array<ArrayBuffer>[];
    receivedBytes: number;
    encryptionMetadata?: ProximityFileTransferEncryptionMetadata;
};

type PendingProximityFileEncryption = {
    keyPromise: Promise<ProximityFileTransferEncryptionKey>;
    metadataPromise: Promise<ProximityFileTransferEncryptionMetadata>;
    resolveKey: (key: ProximityFileTransferEncryptionKey) => void;
    resolveMetadata: (metadata: ProximityFileTransferEncryptionMetadata) => void;
};

export class ProximityFileTransferService {
    private readonly outgoingTransfers = new Map<string, ProximityFileTransferOffer>();
    private readonly incomingTransfers = new Map<string, IncomingProximityFileTransferOffer>();
    private readonly receivingTransfers = new Map<string, ReceivingTransfer>();
    private readonly pendingIncomingEncryption = new Map<string, PendingProximityFileEncryption>();
    private readonly peerSessions = new Map<string, PeerSession>();
    private readonly subscriptions = new Subscription();
    private readonly observedTransferTransports = new WeakSet<ProximityFileTransferTransport>();
    private readonly incomingOfferSubject = new Subject<IncomingProximityFileTransferOffer>();
    public readonly incomingOffers: Observable<IncomingProximityFileTransferOffer> = this.incomingOfferSubject;
    private readonly transferUpdateSubject = new Subject<ProximityFileTransferUpdate>();
    public readonly transferUpdates: Observable<ProximityFileTransferUpdate> = this.transferUpdateSubject;

    constructor(private readonly options: ProximityFileTransferServiceOptions) {
        this.subscriptions.add(
            this.options.space.observePrivateEvent("proximityFileTransferOffer").subscribe((event) => {
                const senderSpaceUserId = typeof event.sender === "string" ? event.sender : event.sender.spaceUserId;
                if (senderSpaceUserId === this.options.localSpaceUserId) {
                    return;
                }
                const offer = {
                    ...event.proximityFileTransferOffer,
                    senderSpaceUserId,
                };
                this.incomingTransfers.set(offer.transferId, offer);
                this.transferUpdateSubject.next({ transferId: offer.transferId, state: "pending", progress: 0 });
                this.incomingOfferSubject.next(offer);
            }),
        );
        this.subscriptions.add(
            this.options.space.observePrivateEvent("proximityFileTransferSignal").subscribe((event) => {
                const senderSpaceUserId = typeof event.sender === "string" ? event.sender : event.sender.spaceUserId;
                this.handleTransferSignal(senderSpaceUserId, event.proximityFileTransferSignal).catch((error) => {
                    console.error("Error while handling proximity file transfer signal", error);
                });
            }),
        );
    }

    async createOutgoingOffers(
        files: File[],
        recipients: ProximityFileTransferRecipient[],
    ): Promise<ProximityFileTransferOffer[]> {
        const validation = validateProximityFiles(files);
        if (!validation.ok) {
            throw new Error(validation.reason);
        }

        const recipientIds = recipients
            .map((recipient) => recipient.spaceUserId)
            .filter((spaceUserId) => spaceUserId !== this.options.localSpaceUserId);

        const preparedOffers = await Promise.all(
            files.map(async (file) => {
                const transferId = uuidv4();
                return {
                    file,
                    transferId,
                    offer: await this.createOutgoingOffer(file, transferId, recipientIds),
                };
            }),
        );

        const offers: ProximityFileTransferOffer[] = [];
        for (const { file, transferId, offer } of preparedOffers) {
            const transferTransport = this.getTransferTransport();
            this.outgoingTransfers.set(transferId, offer);
            transferTransport?.sendFile(offer.encryptedFile ?? file, transferId, recipientIds);

            for (const recipientId of recipientIds) {
                this.options.space.emitPrivateMessage(
                    {
                        $case: "proximityFileTransferOffer",
                        proximityFileTransferOffer: {
                            transferId,
                            fileName: file.name,
                            mimeType: file.type,
                            size: file.size,
                            messageType: offer.messageType,
                            characterTextures: [],
                            name: undefined,
                            sha256: offer.sha256,
                            encryptionAlgorithm: offer.encryptionAlgorithm,
                            encryptionKeyId: offer.encryptionKeyId,
                        },
                    },
                    recipientId,
                );
            }

            offers.push(offer);
        }
        return offers;
    }

    private async createOutgoingOffer(
        file: File,
        transferId: string,
        recipientIds: string[],
    ): Promise<ProximityFileTransferOffer> {
        const offer: ProximityFileTransferOffer = {
            transferId,
            file,
            messageType: getMessageTypeFromFile(file),
            recipients: recipientIds,
        };

        if (!this.isSecurityEnabled()) {
            return offer;
        }

        const encryptionKey = await generateProximityFileEncryptionKey();
        const encrypted = await encryptProximityFileBlob(file, encryptionKey);
        return {
            ...offer,
            sha256: await hashProximityFileBlob(file),
            encryptionAlgorithm: encrypted.metadata.algorithm,
            encryptionKeyId: transferId,
            encryptedFile: new File([encrypted.blob], file.name, { type: file.type }),
            encryptionKey,
            encryptionMetadata: encrypted.metadata,
        };
    }

    async download(transferId: string): Promise<void> {
        const offer = this.incomingTransfers.get(transferId);
        if (!offer) {
            throw new Error("Unknown proximity file transfer");
        }

        this.transferUpdateSubject.next({ transferId, state: "connecting", progress: 0 });
        const transferTransport = this.getTransferTransport();
        if (transferTransport) {
            const security =
                this.isSecurityEnabled() && this.isEncryptedOffer(offer)
                    ? this.waitForIncomingEncryption(transferId)
                    : undefined;
            if (security) {
                const session = await this.ensureInitiatorPeerSession(offer.senderSpaceUserId, transferId);
                const dataChannel = await session.openPromise;
                this.sendControlMessage(dataChannel, {
                    type: "proximity_file_request",
                    transferId,
                });
            }
            await transferTransport.requestDownload(
                offer,
                security
                    ? {
                          encryptionKey: security.keyPromise,
                          encryptionMetadata: security.metadataPromise,
                      }
                    : undefined,
            );
            return;
        }

        const session = await this.ensureInitiatorPeerSession(offer.senderSpaceUserId, transferId);
        const dataChannel = await session.openPromise;
        this.sendControlMessage(dataChannel, {
            type: "proximity_file_request",
            transferId,
        });
    }

    destroy(): void {
        this.subscriptions.unsubscribe();
        this.incomingOfferSubject.complete();
        this.transferUpdateSubject.complete();
        this.outgoingTransfers.clear();
        this.incomingTransfers.clear();
        this.receivingTransfers.clear();
        this.pendingIncomingEncryption.clear();
        this.options.transferTransport?.destroy();
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
        const peerConnectionFactory =
            this.options.createPeerConnection ??
            ((configuration: RTCConfiguration) => new RTCPeerConnection(configuration));
        if (!this.options.getIceServers) {
            throw new Error("Missing WebRTC ICE server provider");
        }
        const peerConnection = peerConnectionFactory({ iceServers: await this.options.getIceServers() });
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
            queue: Promise.resolve(),
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
            this.handleDataChannelMessage(session, event.data).catch((error) => {
                console.error("Error while handling proximity file transfer data channel message", error);
            });
        };
        dataChannel.onclose = () => {
            this.closePeerSession(session.remoteSpaceUserId);
        };
    }

    private async handleSignal(
        senderSpaceUserId: string,
        signalMessage: { transferId: string; connectionId: string; signal: string },
    ): Promise<void> {
        if (!this.canExchangeWith(senderSpaceUserId)) {
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

    private async handleTransferSignal(
        senderSpaceUserId: string,
        signalMessage: { transferId: string; connectionId: string; signal: string },
    ): Promise<void> {
        const signal = JSON.parse(signalMessage.signal) as { type?: string };
        const transferTransport = this.getTransferTransport();
        if (signal.type !== "description" && signal.type !== "candidate" && transferTransport?.handleSignal) {
            await transferTransport.handleSignal(senderSpaceUserId, signalMessage);
            return;
        }

        await this.handleSignal(senderSpaceUserId, signalMessage);
    }

    private async handleDataChannelMessage(session: PeerSession, data: unknown): Promise<void> {
        if (typeof data === "string") {
            const message = decodeProximityFileControlMessage(data);
            switch (message.type) {
                case "proximity_file_request": {
                    await this.sendOutgoingEncryptionKey(session, message.transferId);
                    if (this.getTransferTransport() && this.isSecurityEnabled()) {
                        return;
                    }
                    await this.enqueueOutgoingTransfer(session, message.transferId);
                    break;
                }
                case "proximity_file_key": {
                    if (message.encryptionIv === undefined || message.plainMimeType === undefined) {
                        return;
                    }
                    await this.resolveIncomingEncryptionKey(message.transferId, message.rawKey, {
                        algorithm: "XCHACHA20-POLY1305",
                        iv: message.encryptionIv,
                        mimeType: message.plainMimeType,
                    });
                    break;
                }
                case "proximity_file_start": {
                    const offer = this.incomingTransfers.get(message.transferId);
                    if (!offer) {
                        return;
                    }
                    const encryptionMetadata =
                        message.encryptionAlgorithm === "XCHACHA20-POLY1305" &&
                        message.encryptionIv !== undefined &&
                        message.plainMimeType !== undefined
                            ? {
                                  algorithm: message.encryptionAlgorithm,
                                  iv: message.encryptionIv,
                                  mimeType: message.plainMimeType,
                              }
                            : undefined;
                    const expectedBytes = this.validateIncomingTransferSize(
                        message.transferId,
                        offer,
                        message.size,
                        encryptionMetadata !== undefined,
                    );
                    if (expectedBytes === undefined) {
                        return;
                    }
                    this.receivingTransfers.set(message.transferId, {
                        offer,
                        expectedBytes,
                        chunks: [],
                        receivedBytes: 0,
                        encryptionMetadata,
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
        receivingTransfer.chunks.push(frame.chunk);
        receivingTransfer.receivedBytes = nextReceivedBytes;
        this.transferUpdateSubject.next({
            transferId: frame.transferId,
            state: "downloading",
            progress: Math.min(receivingTransfer.receivedBytes / Math.max(receivingTransfer.expectedBytes, 1), 1),
        });
    }

    private enqueueOutgoingTransfer(session: PeerSession, transferId: string): Promise<void> {
        session.queue = session.queue.then(() => this.sendOutgoingTransfer(session, transferId));
        return session.queue;
    }

    private async sendOutgoingTransfer(session: PeerSession, transferId: string): Promise<void> {
        const transfer = this.outgoingTransfers.get(transferId);
        const dataChannel = session.dataChannel;
        if (
            !transfer ||
            !dataChannel ||
            !transfer.recipients.includes(session.remoteSpaceUserId) ||
            !this.canExchangeWith(session.remoteSpaceUserId)
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

        const fileToSend = transfer.encryptedFile ?? transfer.file;
        this.sendControlMessage(dataChannel, {
            type: "proximity_file_start",
            transferId,
            fileName: transfer.file.name,
            mimeType: transfer.file.type,
            size: fileToSend.size,
            sha256: transfer.sha256,
            encryptionAlgorithm: transfer.encryptionMetadata?.algorithm,
            encryptionIv: transfer.encryptionMetadata?.iv,
            plainMimeType: transfer.encryptionMetadata?.mimeType,
        });

        for (let offset = 0; offset < fileToSend.size; offset += PROXIMITY_FILE_TRANSFER_CHUNK_SIZE) {
            // eslint-disable-next-line no-await-in-loop
            const chunkBuffer = await fileToSend
                .slice(offset, offset + PROXIMITY_FILE_TRANSFER_CHUNK_SIZE)
                .arrayBuffer();
            const chunk = new Uint8Array(chunkBuffer);
            dataChannel.send(copyToArrayBuffer(encodeProximityFileChunkFrame(transferId, chunk)));
            // eslint-disable-next-line no-await-in-loop
            await this.waitForBackpressure(dataChannel);
        }

        this.sendControlMessage(dataChannel, {
            type: "proximity_file_complete",
            transferId,
        });
    }

    private async completeReceivingTransfer(transferId: string): Promise<void> {
        const receivingTransfer = this.receivingTransfers.get(transferId);
        if (!receivingTransfer) {
            return;
        }
        if (receivingTransfer.receivedBytes !== receivingTransfer.expectedBytes) {
            this.failReceivingTransfer(transferId, "integrity-check-failed");
            return;
        }
        const blob = await this.createVerifiedReceivingBlob(receivingTransfer);
        if (!blob) {
            return;
        }
        const url = URL.createObjectURL(blob);
        this.receivingTransfers.delete(transferId);
        this.transferUpdateSubject.next({ transferId, state: "ready", progress: 1, url });
    }

    private async createVerifiedReceivingBlob(receivingTransfer: ReceivingTransfer): Promise<Blob | undefined> {
        const receivedParts = receivingTransfer.chunks.map((chunk) => copyToArrayBuffer(chunk));
        if (!receivingTransfer.encryptionMetadata) {
            return new Blob(receivedParts, { type: receivingTransfer.offer.mimeType });
        }

        const encryptedBlob = new Blob(receivedParts, { type: "application/octet-stream" });
        const decryptedBlob = await decryptProximityFileBlob(
            encryptedBlob,
            await this.getIncomingEncryptionKey(receivingTransfer.offer.transferId),
            receivingTransfer.encryptionMetadata,
        );
        if (
            decryptedBlob.size !== Number(receivingTransfer.offer.size) ||
            (await hashProximityFileBlob(decryptedBlob)) !== receivingTransfer.offer.sha256
        ) {
            this.receivingTransfers.delete(receivingTransfer.offer.transferId);
            this.transferUpdateSubject.next({
                transferId: receivingTransfer.offer.transferId,
                state: "error",
                progress: 0,
                error: "integrity-check-failed",
            });
            return undefined;
        }
        return decryptedBlob;
    }

    private validateIncomingTransferSize(
        transferId: string,
        offer: IncomingProximityFileTransferOffer,
        announcedSize: number,
        isEncrypted: boolean,
    ): number | undefined {
        const offerSize = Number(offer.size);
        const maxExpectedWireSize = isEncrypted ? getMaxEncryptedTransferWireSize(offerSize) : offerSize;
        if (
            !Number.isFinite(offerSize) ||
            offerSize < 0 ||
            offerSize > PROXIMITY_FILE_TRANSFER_MAX_FILE_SIZE ||
            !Number.isFinite(announcedSize) ||
            announcedSize < 0 ||
            announcedSize > maxExpectedWireSize
        ) {
            this.failReceivingTransfer(transferId, "file-too-large");
            return undefined;
        }
        if (!isEncrypted && announcedSize !== offerSize) {
            this.failReceivingTransfer(transferId, "integrity-check-failed");
            return undefined;
        }
        return announcedSize;
    }

    private failReceivingTransfer(transferId: string, error: string): void {
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
            const previousHandler = dataChannel.onbufferedamountlow;
            dataChannel.onbufferedamountlow = (event) => {
                dataChannel.onbufferedamountlow = previousHandler;
                previousHandler?.call(dataChannel, event);
                resolve();
            };
        });
    }

    private sendControlMessage(
        dataChannel: RTCDataChannel,
        message: Parameters<typeof encodeProximityFileControlMessage>[0],
    ): void {
        dataChannel.send(encodeProximityFileControlMessage(message));
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

    private canExchangeWith(spaceUserId: string): boolean {
        return this.options.canExchangeWith?.(spaceUserId) ?? true;
    }

    private isSecurityEnabled(): boolean {
        return this.options.isSecurityEnabled?.() ?? false;
    }

    private isEncryptedOffer(offer: IncomingProximityFileTransferOffer): boolean {
        return (
            offer.sha256 !== undefined &&
            offer.encryptionAlgorithm === "XCHACHA20-POLY1305" &&
            offer.encryptionKeyId !== undefined
        );
    }

    private waitForIncomingEncryption(transferId: string): PendingProximityFileEncryption {
        const existing = this.pendingIncomingEncryption.get(transferId);
        if (existing) {
            return existing;
        }

        let resolveKey!: (key: ProximityFileTransferEncryptionKey) => void;
        let resolveMetadata!: (metadata: ProximityFileTransferEncryptionMetadata) => void;
        const keyPromise = new Promise<ProximityFileTransferEncryptionKey>((resolve) => {
            resolveKey = resolve;
        });
        const metadataPromise = new Promise<ProximityFileTransferEncryptionMetadata>((resolve) => {
            resolveMetadata = resolve;
        });
        const pending = { keyPromise, metadataPromise, resolveKey, resolveMetadata };
        this.pendingIncomingEncryption.set(transferId, pending);
        return pending;
    }

    private getIncomingEncryptionKey(transferId: string): Promise<ProximityFileTransferEncryptionKey> {
        return this.waitForIncomingEncryption(transferId).keyPromise;
    }

    private async resolveIncomingEncryptionKey(
        transferId: string,
        rawKey: string,
        metadata: ProximityFileTransferEncryptionMetadata,
    ): Promise<void> {
        const pending = this.waitForIncomingEncryption(transferId);
        pending.resolveKey(await importProximityFileEncryptionKey(rawKey));
        pending.resolveMetadata(metadata);
    }

    private async sendOutgoingEncryptionKey(session: PeerSession, transferId: string): Promise<void> {
        const transfer = this.outgoingTransfers.get(transferId);
        const dataChannel = session.dataChannel;
        if (!transfer?.encryptionKey || !transfer.encryptionMetadata || !dataChannel || !this.isSecurityEnabled()) {
            return;
        }

        this.sendControlMessage(dataChannel, {
            type: "proximity_file_key",
            transferId,
            rawKey: await exportProximityFileEncryptionKey(transfer.encryptionKey),
            encryptionIv: transfer.encryptionMetadata.iv,
            plainMimeType: transfer.encryptionMetadata.mimeType,
        });
    }

    private getTransferTransport(): ProximityFileTransferTransport | undefined {
        const transferTransport = this.options.transferTransport ?? this.options.getTransferTransport?.();
        if (transferTransport?.transferUpdates && !this.observedTransferTransports.has(transferTransport)) {
            this.observedTransferTransports.add(transferTransport);
            this.subscriptions.add(
                transferTransport.transferUpdates.subscribe((update) => {
                    this.transferUpdateSubject.next(update);
                }),
            );
        }
        return transferTransport;
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

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return buffer;
}

export function getMaxEncryptedTransferWireSize(plainSize: number): number {
    if (plainSize === 0) {
        return 0;
    }
    return (
        plainSize +
        Math.ceil(plainSize / PROXIMITY_FILE_TRANSFER_ENCRYPTED_CHUNK_SIZE) *
            PROXIMITY_FILE_TRANSFER_ENCRYPTED_CHUNK_OVERHEAD
    );
}
