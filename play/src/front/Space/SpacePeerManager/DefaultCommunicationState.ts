import type { Subscription } from "rxjs";
import type { SimplePeerConnectionInterface, ICommunicationState } from "./SpacePeerManager";

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

    shutdown(): void {
        return;
    }
}
