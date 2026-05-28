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

export const PROXIMITY_FILE_TRANSFER_MAX_FILES = 3;
export const PROXIMITY_FILE_TRANSFER_MAX_FILE_SIZE = 25 * 1024 * 1024;
const PROXIMITY_FILE_TRANSFER_CHUNK_SIZE = 64 * 1024;
const PROXIMITY_FILE_TRANSFER_BUFFERED_AMOUNT_LOW_THRESHOLD = 256 * 1024;
const PROXIMITY_FILE_TRANSFER_NEGOTIATION_TIMEOUT = 15_000;

export type ProximityFileValidationResult = { ok: true } | { ok: false; reason: "too-many-files" | "file-too-large" };

export function validateProximityFiles(files: Iterable<File>): ProximityFileValidationResult {
    const fileArray = Array.from(files);
    if (fileArray.length > PROXIMITY_FILE_TRANSFER_MAX_FILES) {
        return { ok: false, reason: "too-many-files" };
    }

    if (fileArray.some((file) => file.size > PROXIMITY_FILE_TRANSFER_MAX_FILE_SIZE)) {
        return { ok: false, reason: "file-too-large" };
    }

    return { ok: true };
}

export type ProximityFileTransferRecipient = {
    spaceUserId: string;
};

export type ProximityFileTransferOffer = {
    transferId: string;
    file: File;
    messageType: "file" | "image" | "audio" | "video";
    recipients: string[];
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
    chunks: Uint8Array<ArrayBuffer>[];
    receivedBytes: number;
};

export class ProximityFileTransferService {
    private readonly outgoingTransfers = new Map<string, ProximityFileTransferOffer>();
    private readonly incomingTransfers = new Map<string, IncomingProximityFileTransferOffer>();
    private readonly receivingTransfers = new Map<string, ReceivingTransfer>();
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
            })
        );
        this.subscriptions.add(
            this.options.space.observePrivateEvent("proximityFileTransferSignal").subscribe((event) => {
                const senderSpaceUserId = typeof event.sender === "string" ? event.sender : event.sender.spaceUserId;
                this.handleTransferSignal(senderSpaceUserId, event.proximityFileTransferSignal).catch((error) => {
                    console.error("Error while handling proximity file transfer signal", error);
                });
            })
        );
    }

    createOutgoingOffers(
        files: Iterable<File>,
        recipients: ProximityFileTransferRecipient[]
    ): ProximityFileTransferOffer[] {
        const validation = validateProximityFiles(files);
        if (!validation.ok) {
            throw new Error(validation.reason);
        }

        const recipientIds = recipients
            .map((recipient) => recipient.spaceUserId)
            .filter((spaceUserId) => spaceUserId !== this.options.localSpaceUserId);

        return Array.from(files).map((file) => {
            const transferId = uuidv4();
            const offer: ProximityFileTransferOffer = {
                transferId,
                file,
                messageType: getMessageTypeFromFile(file),
                recipients: recipientIds,
            };
            this.outgoingTransfers.set(transferId, offer);
            this.getTransferTransport()?.sendFile(file, transferId, recipientIds);

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
                        },
                    },
                    recipientId
                );
            }

            return offer;
        });
    }

    async download(transferId: string): Promise<void> {
        const offer = this.incomingTransfers.get(transferId);
        if (!offer) {
            throw new Error("Unknown proximity file transfer");
        }

        this.transferUpdateSubject.next({ transferId, state: "connecting", progress: 0 });
        const transferTransport = this.getTransferTransport();
        if (transferTransport) {
            await transferTransport.requestDownload(offer);
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
        signalMessage: { transferId: string; connectionId: string; signal: string }
    ): Promise<void> {
        if (!this.canExchangeWith(senderSpaceUserId)) {
            return;
        }

        const signal = JSON.parse(signalMessage.signal) as ProximityFileTransferSignalPayload;
        let session = this.peerSessions.get(senderSpaceUserId);

        if (signal.type === "description" && signal.description.type === "offer") {
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
        signalMessage: { transferId: string; connectionId: string; signal: string }
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
                    await this.enqueueOutgoingTransfer(session, message.transferId);
                    break;
                }
                case "proximity_file_start": {
                    const offer = this.incomingTransfers.get(message.transferId);
                    if (!offer) {
                        return;
                    }
                    this.receivingTransfers.set(message.transferId, { offer, chunks: [], receivedBytes: 0 });
                    this.transferUpdateSubject.next({
                        transferId: message.transferId,
                        state: "downloading",
                        progress: 0,
                    });
                    break;
                }
                case "proximity_file_complete": {
                    this.completeReceivingTransfer(message.transferId);
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
        receivingTransfer.chunks.push(frame.chunk);
        receivingTransfer.receivedBytes += frame.chunk.byteLength;
        this.transferUpdateSubject.next({
            transferId: frame.transferId,
            state: "downloading",
            progress: Math.min(receivingTransfer.receivedBytes / Number(receivingTransfer.offer.size), 1),
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

        this.sendControlMessage(dataChannel, {
            type: "proximity_file_start",
            transferId,
            fileName: transfer.file.name,
            mimeType: transfer.file.type,
            size: transfer.file.size,
        });

        for (let offset = 0; offset < transfer.file.size; offset += PROXIMITY_FILE_TRANSFER_CHUNK_SIZE) {
            // eslint-disable-next-line no-await-in-loop
            const chunkBuffer = await transfer.file
                .slice(offset, offset + PROXIMITY_FILE_TRANSFER_CHUNK_SIZE)
                .arrayBuffer();
            const chunk = new Uint8Array(chunkBuffer) as Uint8Array<ArrayBuffer>;
            dataChannel.send(encodeProximityFileChunkFrame(transferId, chunk));
            // eslint-disable-next-line no-await-in-loop
            await this.waitForBackpressure(dataChannel);
        }

        this.sendControlMessage(dataChannel, {
            type: "proximity_file_complete",
            transferId,
        });
    }

    private completeReceivingTransfer(transferId: string): void {
        const receivingTransfer = this.receivingTransfers.get(transferId);
        if (!receivingTransfer) {
            return;
        }
        const blob = new Blob(receivingTransfer.chunks, { type: receivingTransfer.offer.mimeType });
        const url = URL.createObjectURL(blob);
        this.receivingTransfers.delete(transferId);
        this.transferUpdateSubject.next({ transferId, state: "ready", progress: 1, url });
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
        message: Parameters<typeof encodeProximityFileControlMessage>[0]
    ): void {
        dataChannel.send(encodeProximityFileControlMessage(message));
    }

    private emitSignal(
        receiverSpaceUserId: string,
        transferId: string,
        connectionId: string,
        signal: ProximityFileTransferSignalPayload
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
            receiverSpaceUserId
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

    private getTransferTransport(): ProximityFileTransferTransport | undefined {
        const transferTransport = this.options.transferTransport ?? this.options.getTransferTransport?.();
        if (transferTransport?.transferUpdates && !this.observedTransferTransports.has(transferTransport)) {
            this.observedTransferTransports.add(transferTransport);
            this.subscriptions.add(
                transferTransport.transferUpdates.subscribe((update) => {
                    this.transferUpdateSubject.next(update);
                })
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
