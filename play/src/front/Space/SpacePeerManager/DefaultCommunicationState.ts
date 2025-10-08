import { Subscription } from "rxjs";
import { Readable } from "svelte/store";
import { SpaceInterface } from "../SpaceInterface";
import { CommunicationType } from "../../Livekit/LivekitConnection";
import { Streamable } from "../../Stores/StreamableCollectionStore";
import { SimplePeerConnectionInterface, ICommunicationState, StreamableSubjects } from "./SpacePeerManager";
import { LivekitState } from "./LivekitState";
import { WebRTCState } from "./WebRTCState";
import { CommunicationMessageType } from "./CommunicationMessageType";

export class DefaultCommunicationState implements ICommunicationState {
    public readonly shouldDisplayRecordButton = false;
    private _rxJsUnsubscribers: Subscription[] = [];
    constructor(
        private _space: SpaceInterface,
        private _streamableSubjects: StreamableSubjects,
        blockedUsersStore: Readable<Set<string>>
    ) {
        this._rxJsUnsubscribers.push(
            this._space
                .observePrivateEvent(CommunicationMessageType.COMMUNICATION_STRATEGY_MESSAGE)
                .subscribe((message) => {
                    if (message.communicationStrategyMessage.strategy === CommunicationType.WEBRTC) {
                        const nextState = new WebRTCState(this._space, this._streamableSubjects, blockedUsersStore);
                        this._space.spacePeerManager.setState(nextState);
                    }
                    if (message.communicationStrategyMessage.strategy === CommunicationType.LIVEKIT) {
                        const nextState = new LivekitState(this._space, this._streamableSubjects, blockedUsersStore);
                        this._space.spacePeerManager.setState(nextState);
                    }
                })
        );
    }

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
}
