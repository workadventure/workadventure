import { Subscription } from "rxjs";
import { SpaceInterface } from "../SpaceInterface";
import { CommunicationType } from "../../Livekit/LivekitConnection";
import { SimplePeerConnectionInterface, ICommunicationState, StreamableSubjects } from "./SpacePeerManager";
import { LivekitState } from "./LivekitState";
import { WebRTCState } from "./WebRTCState";
import { CommunicationMessageType } from "./CommunicationMessageType";

export class DefaultCommunicationState implements ICommunicationState {
    private _rxJsUnsubscribers: Subscription[] = [];
    constructor(private _space: SpaceInterface, private _streamableSubjects: StreamableSubjects) {
        this._rxJsUnsubscribers.push(
            this._space
                .observePrivateEvent(CommunicationMessageType.COMMUNICATION_STRATEGY_MESSAGE)
                .subscribe((message) => {
                    if (message.communicationStrategyMessage.strategy === CommunicationType.WEBRTC) {
                        const nextState = new WebRTCState(this._space, this._streamableSubjects);
                        this._space.spacePeerManager.setState(nextState);
                    }
                    if (message.communicationStrategyMessage.strategy === CommunicationType.LIVEKIT) {
                        const nextState = new LivekitState(this._space, this._streamableSubjects);
                        this._space.spacePeerManager.setState(nextState);
                    }
                })
        );
    }

    completeSwitch() {}

    destroy() {
        this._rxJsUnsubscribers.forEach((unsubscriber) => unsubscriber.unsubscribe());
    }

    getPeer(): SimplePeerConnectionInterface | undefined {
        return undefined;
    }

    shouldSynchronizeMediaState(): boolean {
        return false;
    }

    dispatchSound(url: URL): Promise<void> {
        return Promise.resolve();
    }

    dispatchStream(mediaStream: MediaStream): void {}
}
