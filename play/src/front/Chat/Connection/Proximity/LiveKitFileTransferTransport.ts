import type { PrivateSpaceEvent } from "@workadventure/messages";
import { Subject } from "rxjs";
import type {
    IncomingProximityFileTransferOffer,
    ProximityFileTransferDownloadSecurity,
    ProximityFileTransferUpdate,
    ProximityFileTransferTransport,
} from "./ProximityFileTransferTransport";
import { decryptProximityFileBlob, hashProximityFileBlob } from "./ProximityFileTransferSecurity";

const PROXIMITY_FILE_TRANSFER_LIVEKIT_TOPIC_PREFIX = "wa:proximity-file-transfer:";
const DEFAULT_BATCH_DELAY_MS = 1_000;

export function getProximityFileTransferLiveKitTopic(transferId: string): string {
    return `${PROXIMITY_FILE_TRANSFER_LIVEKIT_TOPIC_PREFIX}${transferId}`;
}

export type LiveKitProximityFileTransferRoom = {
    getIdentityForSpaceUserId(spaceUserId: string): string | undefined;
    hasParticipant(spaceUserId: string): boolean;
    sendFileToIdentities(file: File, options: { destinationIdentities: string[]; topic: string }): Promise<void>;
    registerProximityFileHandler(topic: string, handler: LiveKitProximityFileStreamHandler): () => void;
};

export type LiveKitProximityFileStream = {
    info: {
        name?: string;
        mimeType?: string;
        size?: number;
    };
    readAll(): Promise<BlobPart[]>;
};

export type LiveKitProximityFileStreamHandler = (
    reader: LiveKitProximityFileStream,
    participantIdentity: string
) => Promise<void>;

type LiveKitFileTransferSpace = {
    emitPrivateMessage(message: NonNullable<PrivateSpaceEvent["event"]>, receiverUserId: string): void;
};

type LiveKitFileTransferOptions = {
    localSpaceUserId: string;
    space: LiveKitFileTransferSpace;
    liveKitRoom: LiveKitProximityFileTransferRoom;
    batchDelayMs?: number;
};

type OutgoingLiveKitTransfer = {
    file: File;
    recipients: ReadonlySet<string>;
};

type PendingBatch = {
    requestedBy: Set<string>;
    timeout: ReturnType<typeof setTimeout>;
};

type ExpectedLiveKitDownload = {
    offer: IncomingProximityFileTransferOffer;
    security: ProximityFileTransferDownloadSecurity | undefined;
    unregisterHandler: () => void;
};

export class LiveKitFileTransferTransport implements ProximityFileTransferTransport {
    readonly kind = "livekit" as const;
    private readonly transferUpdateSubject = new Subject<ProximityFileTransferUpdate>();
    readonly transferUpdates = this.transferUpdateSubject.asObservable();
    private readonly outgoingTransfers = new Map<string, OutgoingLiveKitTransfer>();
    private readonly expectedDownloads = new Map<string, ExpectedLiveKitDownload>();
    private readonly pendingBatches = new Map<string, PendingBatch>();

    constructor(private readonly options: LiveKitFileTransferOptions) {}

    canTransferTo(spaceUserId: string): boolean {
        return this.options.liveKitRoom.hasParticipant(spaceUserId);
    }

    requestDownload(
        offer: IncomingProximityFileTransferOffer,
        security?: ProximityFileTransferDownloadSecurity
    ): Promise<void> {
        this.clearExpectedDownload(offer.transferId);
        const unregisterHandler = this.options.liveKitRoom.registerProximityFileHandler(
            getProximityFileTransferLiveKitTopic(offer.transferId),
            (reader, participantIdentity) => this.handleIncomingStream(offer.transferId, reader, participantIdentity)
        );
        this.expectedDownloads.set(offer.transferId, { offer, security, unregisterHandler });
        this.options.space.emitPrivateMessage(
            {
                $case: "proximityFileTransferSignal",
                proximityFileTransferSignal: {
                    transferId: offer.transferId,
                    connectionId: "livekit",
                    signal: JSON.stringify({ type: "livekit_file_request" }),
                },
            },
            offer.senderSpaceUserId
        );
        return Promise.resolve();
    }

    sendFile(file: File, transferId: string, recipients: readonly string[]): void {
        this.outgoingTransfers.set(transferId, {
            file,
            recipients: new Set(recipients),
        });
    }

    handleSignal(
        senderSpaceUserId: string,
        signalMessage: { transferId: string; connectionId: string; signal: string }
    ): Promise<void> {
        const signal = JSON.parse(signalMessage.signal) as { type?: string };
        if (signal.type !== "livekit_file_request") {
            return Promise.resolve();
        }

        this.queueRequest(signalMessage.transferId, senderSpaceUserId);
        return Promise.resolve();
    }

    destroy(): void {
        for (const batch of this.pendingBatches.values()) {
            clearTimeout(batch.timeout);
        }
        this.pendingBatches.clear();
        this.outgoingTransfers.clear();
        for (const transferId of this.expectedDownloads.keys()) {
            this.clearExpectedDownload(transferId);
        }
        this.transferUpdateSubject.complete();
    }

    private queueRequest(transferId: string, requesterSpaceUserId: string): void {
        const transfer = this.outgoingTransfers.get(transferId);
        if (!transfer?.recipients.has(requesterSpaceUserId)) {
            return;
        }
        if (!this.canTransferTo(requesterSpaceUserId)) {
            return;
        }

        const existingBatch = this.pendingBatches.get(transferId);
        if (existingBatch) {
            existingBatch.requestedBy.add(requesterSpaceUserId);
            return;
        }

        const requestedBy = new Set([requesterSpaceUserId]);
        const timeout = setTimeout(() => {
            this.flushBatch(transferId).catch((error) => {
                console.error("Error while sending LiveKit proximity file transfer", error);
            });
        }, this.options.batchDelayMs ?? DEFAULT_BATCH_DELAY_MS);
        this.pendingBatches.set(transferId, { requestedBy, timeout });
    }

    private async flushBatch(transferId: string): Promise<void> {
        const transfer = this.outgoingTransfers.get(transferId);
        const batch = this.pendingBatches.get(transferId);
        if (!transfer || !batch) {
            return;
        }
        this.pendingBatches.delete(transferId);

        const destinationIdentities = Array.from(batch.requestedBy)
            .map((spaceUserId) => this.options.liveKitRoom.getIdentityForSpaceUserId(spaceUserId))
            .filter((identity): identity is string => identity !== undefined);

        if (destinationIdentities.length === 0) {
            return;
        }

        await this.options.liveKitRoom.sendFileToIdentities(transfer.file, {
            destinationIdentities,
            topic: getProximityFileTransferLiveKitTopic(transferId),
        });
    }

    private async handleIncomingStream(
        transferId: string,
        reader: LiveKitProximityFileStream,
        participantIdentity: string
    ): Promise<void> {
        const expectedDownload = this.expectedDownloads.get(transferId);
        if (!expectedDownload) {
            return;
        }

        const senderIdentity = this.options.liveKitRoom.getIdentityForSpaceUserId(
            expectedDownload.offer.senderSpaceUserId
        );
        if (
            senderIdentity !== participantIdentity ||
            expectedDownload.offer.fileName !== reader.info.name ||
            expectedDownload.offer.mimeType !== reader.info.mimeType
        ) {
            return;
        }

        this.transferUpdateSubject.next({ transferId, state: "downloading", progress: 0 });
        const chunks = await reader.readAll();
        const blob = await this.createVerifiedBlob(chunks, expectedDownload);
        if (!blob) {
            return;
        }
        const url = URL.createObjectURL(blob);
        this.clearExpectedDownload(transferId);
        this.transferUpdateSubject.next({ transferId, state: "ready", progress: 1, url });
    }

    private async createVerifiedBlob(
        chunks: BlobPart[],
        expectedDownload: ExpectedLiveKitDownload
    ): Promise<Blob | undefined> {
        const { offer, security } = expectedDownload;
        if (!security) {
            return new Blob(chunks, { type: offer.mimeType });
        }

        const encryptedBlob = new Blob(chunks, { type: "application/octet-stream" });
        const decryptedBlob = await decryptProximityFileBlob(
            encryptedBlob,
            await security.encryptionKey,
            await security.encryptionMetadata
        );
        if (
            decryptedBlob.size !== Number(offer.size) ||
            (await hashProximityFileBlob(decryptedBlob)) !== offer.sha256
        ) {
            this.clearExpectedDownload(offer.transferId);
            this.transferUpdateSubject.next({
                transferId: offer.transferId,
                state: "error",
                progress: 0,
                error: "integrity-check-failed",
            });
            return undefined;
        }
        return decryptedBlob;
    }

    private clearExpectedDownload(transferId: string): void {
        const expectedDownload = this.expectedDownloads.get(transferId);
        expectedDownload?.unregisterHandler();
        this.expectedDownloads.delete(transferId);
    }
}
