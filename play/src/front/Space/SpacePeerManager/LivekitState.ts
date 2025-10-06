import * as Sentry from "@sentry/svelte";
import { Readable } from "svelte/store";
import { LivekitConnection } from "../../Livekit/LivekitConnection";
import { SpaceInterface } from "../SpaceInterface";
import { Streamable } from "../../Stores/StreamableCollectionStore";
import { SimplePeerConnectionInterface, ICommunicationState, StreamableSubjects } from "./SpacePeerManager";

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

    getVideoForUser(spaceUserId: string): Streamable | undefined {
        return this.livekitConnection.getVideoForUser(spaceUserId);
    }

    getScreenSharingForUser(spaceUserId: string): Streamable | undefined {
        return this.livekitConnection.getScreenSharingForUser(spaceUserId);
    }
}
