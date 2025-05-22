import { Subscription } from "rxjs";
import { CommunicationType } from "../../Livekit/LivekitConnection";
import { gameManager } from "../../Phaser/Game/GameManager";
import { SimplePeer } from "../../WebRtc/SimplePeer";
import { SpaceInterface } from "../SpaceInterface";
import { CommunicationMessageType, LivekitState } from "./LivekitState";
import { SimplePeerConnectionInterface, PeerFactoryInterface, ICommunicationState } from "./SpacePeerManager";

export const defaultPeerFactory: PeerFactoryInterface = {
    create: (space: SpaceInterface) => {
        const playerRepository = gameManager.getCurrentGameScene().getRemotePlayersRepository();
        const peer = new SimplePeer(space, playerRepository);
        const spaceFilter = space.getLastSpaceFilter();
        if (spaceFilter) {
            peer.setSpaceFilter(spaceFilter);
        }
        return peer;
    },
};

export class WebRTCState implements ICommunicationState {
    private _peer: SimplePeerConnectionInterface;
    private _nextState: LivekitState | null = null;
    private rxJsUnsubscribers: Subscription[] = [];

    constructor(private space: SpaceInterface, private peerFactory: PeerFactoryInterface = defaultPeerFactory) {
        this._peer = this.peerFactory.create(this.space);

        this.rxJsUnsubscribers.push(
            this.space.observePrivateEvent(CommunicationMessageType.PREPARE_SWITCH_MESSAGE).subscribe((message) => {
                if (message.prepareSwitchMessage.strategy === CommunicationType.LIVEKIT && this._nextState === null) {
                    this._nextState = new LivekitState(this.space);
                }
            })
        );

        this.rxJsUnsubscribers.push(
            this.space.observePrivateEvent(CommunicationMessageType.EXECUTE_SWITCH_MESSAGE).subscribe((message) => {
                if (message.executeSwitchMessage.strategy === CommunicationType.LIVEKIT) {
                    if (!this._nextState) {
                        //throw new Error("Next state is null");
                        console.error("Next state is null");
                        return;
                    }
                    this.space.spacePeerManager.setState(this._nextState);
                }
            })
        );

        this.rxJsUnsubscribers.push(
            this.space
                .observePrivateEvent(CommunicationMessageType.COMMUNICATION_STRATEGY_MESSAGE)
                .subscribe((message) => {
                    if (message.communicationStrategyMessage.strategy === CommunicationType.LIVEKIT) {
                        const nextState = new LivekitState(this.space);
                        this.space.spacePeerManager.setState(nextState);
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
    }

    getPeer(): SimplePeerConnectionInterface | undefined {
        return this._peer;
    }
}
