import { Subscription } from "rxjs";
import { CommunicationType } from "../../Livekit/LivekitConnection";
import { gameManager } from "../../Phaser/Game/GameManager";
import { SimplePeer } from "../../WebRtc/SimplePeer";
import { SpaceInterface } from "../SpaceInterface";
import { LivekitState } from "./LivekitState";
import {
    SimplePeerConnectionInterface,
    PeerFactoryInterface,
    ICommunicationState,
    StreamableSubjects,
} from "./SpacePeerManager";
import { CommunicationMessageType } from "./CommunicationMessageType";

export const defaultPeerFactory: PeerFactoryInterface = {
    create: (_space: SpaceInterface, _streamableSubjects: StreamableSubjects) => {
        const playerRepository = gameManager.getCurrentGameScene().getRemotePlayersRepository();
        const peer = new SimplePeer(_space, playerRepository, _streamableSubjects);
        return peer;
    },
};

export class WebRTCState implements ICommunicationState {
    public readonly shouldDisplayRecordButton = true;
    private _peer: SimplePeerConnectionInterface;
    private _nextState: LivekitState | null = null;
    private _rxJsUnsubscribers: Subscription[] = [];

    constructor(
        private _space: SpaceInterface,
        private _streamableSubjects: StreamableSubjects,
        private _peerFactory: PeerFactoryInterface = defaultPeerFactory
    ) {
        this._peer = this._peerFactory.create(this._space, this._streamableSubjects);

        this._rxJsUnsubscribers.push(
            this._space.observePrivateEvent(CommunicationMessageType.PREPARE_SWITCH_MESSAGE).subscribe((message) => {
                if (message.prepareSwitchMessage.strategy === CommunicationType.LIVEKIT && this._nextState === null) {
                    this._nextState = new LivekitState(this._space, this._streamableSubjects);
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
                }
            })
        );

        this._rxJsUnsubscribers.push(
            this._space
                .observePrivateEvent(CommunicationMessageType.COMMUNICATION_STRATEGY_MESSAGE)
                .subscribe((message) => {
                    if (message.communicationStrategyMessage.strategy === CommunicationType.LIVEKIT) {
                        const nextState = new LivekitState(this._space, this._streamableSubjects);
                        this._space.spacePeerManager.setState(nextState);
                    }
                })
        );
    }

    completeSwitch() {
        //this._peer = this.peerFactory.create(this.space);
    }

    destroy() {
        this._peer.closeAllConnections(false);
        this._peer.unregister();
        this._rxJsUnsubscribers.forEach((unsubscriber) => unsubscriber.unsubscribe());
    }

    getPeer(): SimplePeerConnectionInterface | undefined {
        return this._peer;
    }

    shouldSynchronizeMediaState(): boolean {
        return true;
    }

    dispatchSound(url: URL): Promise<void> {
        return this._peer.dispatchSound(url);
    }

    dispatchStream(mediaStream: MediaStream): void {
        this._peer.dispatchStream(mediaStream);
    }
}
