import type { ProximityFileTransferOfferMessage } from "@workadventure/messages";
import type { Observable } from "rxjs";

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

export interface ProximityFileTransferTransport {
    readonly kind: "livekit" | "webrtc";
    readonly transferUpdates?: Observable<ProximityFileTransferUpdate>;
    canTransferTo(spaceUserId: string): boolean;
    requestDownload(offer: IncomingProximityFileTransferOffer): Promise<void>;
    sendFile(file: File, transferId: string, recipients: readonly string[]): void;
    handleSignal?(
        senderSpaceUserId: string,
        signalMessage: { transferId: string; connectionId: string; signal: string }
    ): Promise<void>;
    destroy(): void;
}
