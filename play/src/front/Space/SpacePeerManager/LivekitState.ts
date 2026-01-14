import * as Sentry from "@sentry/svelte";
import type { Readable } from "svelte/store";
import { LivekitConnection } from "../../Livekit/LivekitConnection";
import type { SpaceInterface } from "../SpaceInterface";
import type { SimplePeerConnectionInterface, ICommunicationState, StreamableSubjects } from "./SpacePeerManager";

export class LivekitState implements ICommunicationState {
    private livekitConnection: LivekitConnection;
    constructor(
        private _space: SpaceInterface,
        private _streamableSubjects: StreamableSubjects,
        private _blockedUsersStore: Readable<Set<string>>
    ) {
        this.livekitConnection = new LivekitConnection(this._space, this._streamableSubjects, this._blockedUsersStore);
    }

    destroy() {
        this.livekitConnection.destroy();
    }

    getPeer(): SimplePeerConnectionInterface | undefined {
        return undefined;
    }

    shouldSynchronizeMediaState(): boolean {
        return true;
    }

    dispatchStream(mediaStream: MediaStream): void {
        this.livekitConnection.dispatchStream(mediaStream).catch((err) => {
            console.error("An error occurred in dispatchStream", err);
            Sentry.captureException(err);
        });
    }

    /**
     * Starts the shutdown process of the communication state. It does not remove all video peers immediately,
     * but any asynchronous operation receiving a new stream should be ignored after this call.
     */
    shutdown(): void {
        this.livekitConnection.shutdown();
    }
}
