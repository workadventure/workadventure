import { Subscription } from "rxjs";
import { Readable } from "svelte/store";
import { CommunicationType } from "../../Livekit/LivekitConnection";
import { SimplePeer } from "../../WebRtc/SimplePeer";
import { SpaceInterface } from "../SpaceInterface";
import { Streamable } from "../../Stores/StreamableCollectionStore";
import { LivekitState } from "./LivekitState";
import {
    SimplePeerConnectionInterface,
    PeerFactoryInterface,
    ICommunicationState,
    StreamableSubjects,
} from "./SpacePeerManager";
import { CommunicationMessageType } from "./CommunicationMessageType";

export const defaultPeerFactory: PeerFactoryInterface = {
    create: (
        _space: SpaceInterface,
        _streamableSubjects: StreamableSubjects,
        _blockedUsersStore: Readable<Set<string>>
    ) => {
        const peer = new SimplePeer(_space, _streamableSubjects, _blockedUsersStore);
        return peer;
    },
};

export class WebRTCState implements ICommunicationState {
    private _peer: SimplePeerConnectionInterface;
    private _nextState: LivekitState | null = null;
    private _rxJsUnsubscribers: Subscription[] = [];

    constructor(
        private _space: SpaceInterface,
        private _streamableSubjects: StreamableSubjects,
        _blockedUsersStore: Readable<Set<string>>,
        private _peerFactory: PeerFactoryInterface = defaultPeerFactory
    ) {
        this._peer = this._peerFactory.create(this._space, this._streamableSubjects, _blockedUsersStore);

        this._rxJsUnsubscribers.push(
            this._space.observePrivateEvent(CommunicationMessageType.PREPARE_SWITCH_MESSAGE).subscribe((message) => {
                if (message.prepareSwitchMessage.strategy === CommunicationType.LIVEKIT && this._nextState === null) {
                    this._nextState = new LivekitState(this._space, this._streamableSubjects, _blockedUsersStore);
                }
            })
        );

        this._rxJsUnsubscribers.push(
            this._space.observePrivateEvent(CommunicationMessageType.EXECUTE_SWITCH_MESSAGE).subscribe((message) => {
                if (message.executeSwitchMessage.strategy === CommunicationType.LIVEKIT) {
                    if (!this._nextState) {
                        //throw new Error("Next state is null");
                        console.error("Next state is null");
                        return;
                    }
                    this._space.spacePeerManager.setState(this._nextState);
                    this._nextState = null;
                }
            })
        );

        this._rxJsUnsubscribers.push(
            this._space.observePrivateEvent(CommunicationMessageType.CANCEL_SWITCH_MESSAGE).subscribe((message) => {
                if (message.cancelSwitchMessage.strategy === CommunicationType.LIVEKIT && this._nextState) {
                    this._nextState.destroy();
                    this._nextState = null;
                }
            })
        );
    }

    completeSwitch() {
        //this._peer = this.peerFactory.create(this.space);
    }

    destroy() {
        this._peer.destroy();
        this._rxJsUnsubscribers.forEach((unsubscriber) => unsubscriber.unsubscribe());
    }

    getPeer(): SimplePeerConnectionInterface | undefined {
        return this._peer;
    }

    shouldSynchronizeMediaState(): boolean {
        return true;
    }

    dispatchStream(mediaStream: MediaStream): void {
        this._peer.dispatchStream(mediaStream);
    }

    blockRemoteUser(userId: string): void {
        this._peer.blockedFromRemotePlayer(userId);
    }

    getVideoForUser(spaceUserId: string): Streamable | undefined {
        return this._peer.getVideoForUser(spaceUserId);
    }

    getScreenSharingForUser(spaceUserId: string): Streamable | undefined {
        return this._peer.getScreenSharingForUser(spaceUserId);
    }
}
