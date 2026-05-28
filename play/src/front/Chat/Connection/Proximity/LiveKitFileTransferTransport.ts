import type { PrivateSpaceEvent } from "@workadventure/messages";
import { Subject } from "rxjs";
import type {
    IncomingProximityFileTransferOffer,
    ProximityFileTransferUpdate,
    ProximityFileTransferTransport,
} from "./ProximityFileTransferTransport";

export const PROXIMITY_FILE_TRANSFER_LIVEKIT_TOPIC = "wa:proximity-file-transfer";
const DEFAULT_BATCH_DELAY_MS = 1_000;

export type LiveKitProximityFileTransferRoom = {
    getIdentityForSpaceUserId(spaceUserId: string): string | undefined;
    hasParticipant(spaceUserId: string): boolean;
    sendFileToIdentities(
        file: File,
        options: { transferId: string; destinationIdentities: string[]; topic: string }
    ): Promise<void>;
    registerProximityFileHandler(handler: LiveKitProximityFileStreamHandler): () => void;
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

export class LiveKitFileTransferTransport implements ProximityFileTransferTransport {
    readonly kind = "livekit" as const;
    private readonly transferUpdateSubject = new Subject<ProximityFileTransferUpdate>();
    readonly transferUpdates = this.transferUpdateSubject.asObservable();
    private readonly outgoingTransfers = new Map<string, OutgoingLiveKitTransfer>();
    private readonly expectedDownloads = new Map<string, IncomingProximityFileTransferOffer>();
    private readonly pendingBatches = new Map<string, PendingBatch>();
    private readonly unregisterHandler: () => void;

    constructor(private readonly options: LiveKitFileTransferOptions) {
        this.unregisterHandler = options.liveKitRoom.registerProximityFileHandler((reader, participantIdentity) =>
            this.handleIncomingStream(reader, participantIdentity)
        );
    }

    canTransferTo(spaceUserId: string): boolean {
        return this.options.liveKitRoom.hasParticipant(spaceUserId);
    }

    requestDownload(offer: IncomingProximityFileTransferOffer): Promise<void> {
        this.expectedDownloads.set(offer.transferId, offer);
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
        this.expectedDownloads.clear();
        this.transferUpdateSubject.complete();
        this.unregisterHandler();
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
            transferId,
            destinationIdentities,
            topic: PROXIMITY_FILE_TRANSFER_LIVEKIT_TOPIC,
        });
    }

    private async handleIncomingStream(reader: LiveKitProximityFileStream, participantIdentity: string): Promise<void> {
        const matchingEntry = Array.from(this.expectedDownloads.entries()).find(([, offer]) => {
            const senderIdentity = this.options.liveKitRoom.getIdentityForSpaceUserId(offer.senderSpaceUserId);
            return (
                senderIdentity === participantIdentity &&
                offer.fileName === reader.info.name &&
                offer.mimeType === reader.info.mimeType
            );
        });
        if (!matchingEntry) {
            return;
        }

        const [transferId, offer] = matchingEntry;
        this.transferUpdateSubject.next({ transferId, state: "downloading", progress: 0 });
        const chunks = await reader.readAll();
        const blob = new Blob(chunks, { type: offer.mimeType });
        const url = URL.createObjectURL(blob);
        this.expectedDownloads.delete(transferId);
        this.transferUpdateSubject.next({ transferId, state: "ready", progress: 1, url });
    }
}
