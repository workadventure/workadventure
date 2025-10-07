import { Subscription } from "rxjs";
import { Streamable } from "../../Stores/StreamableCollectionStore";
import { SimplePeerConnectionInterface, ICommunicationState } from "./SpacePeerManager";

export class DefaultCommunicationState implements ICommunicationState {
    private _rxJsUnsubscribers: Subscription[] = [];
    destroy() {
        this._rxJsUnsubscribers.forEach((unsubscriber) => unsubscriber.unsubscribe());
    }

    getPeer(): SimplePeerConnectionInterface | undefined {
        return undefined;
    }

    shouldSynchronizeMediaState(): boolean {
        return false;
    }

    dispatchStream(mediaStream: MediaStream): void {}

    getVideoForUser(spaceUserId: string): Streamable | undefined {
        return undefined;
    }

    getScreenSharingForUser(spaceUserId: string): Streamable | undefined {
        return undefined;
    }

    shutdown(): void {
        return;
    }
}
