import { Subscription } from "rxjs";
import { CommunicationType } from "../../Livekit/LivekitConnection";
import { gameManager } from "../../Phaser/Game/GameManager";
import { SimplePeer } from "../../WebRtc/SimplePeer";
import { SpaceInterface } from "../SpaceInterface";
import { LivekitState } from "./LivekitState";
import { SimplePeerConnectionInterface, PeerFactoryInterface, SpacePeerManager, ICommunicationState } from "./SpacePeerManager";

export const defaultPeerFactory: PeerFactoryInterface = {
    create: (space: SpaceInterface) => {
        const repository = gameManager.getCurrentGameScene().getRemotePlayersRepository();
        return new SimplePeer(space, repository);
    },
};

export class WebRTCState implements ICommunicationState {
    private _peer: SimplePeerConnectionInterface;
    private _nextState: LivekitState | null = null;
    private rxJsUnsubscribers: Subscription[] = [];
    
    constructor(private space: SpaceInterface, private peerManager: SpacePeerManager , private peerFactory: PeerFactoryInterface = defaultPeerFactory) {
        this._peer = this.peerFactory.create(this.space);
        console.log("WebRTCState constructor");

        this.rxJsUnsubscribers.push(
            this.space.observePrivateEvent("prepareSwitchMessage").subscribe((message) => {
                if(message.prepareSwitchMessage.strategy === CommunicationType.LIVEKIT) {
                    this._nextState = new LivekitState(this.space, this.peerManager);
                }
            })
        );

        this.rxJsUnsubscribers.push(
            this.space.observePrivateEvent("executeSwitchMessage").subscribe((message) => {
                if (message.executeSwitchMessage.strategy === CommunicationType.LIVEKIT) {
                    this._peer.closeAllConnections();
                    this._peer?.unregister();
                    this._nextState?.completeSwitch();  
                    if(!this._nextState) {
                        //throw new Error("Next state is null");
                        console.error("Next state is null");
                        return;
                    }
                    this.peerManager.setState(this._nextState);
                }
            })
        );

        this.rxJsUnsubscribers.push(
            this.space.observePrivateEvent("communicationStrategyMessage").subscribe((message) => {
                console.log(">>>>> communicationStrategyMessage", message);
                if (message.communicationStrategyMessage.strategy === CommunicationType.LIVEKIT) {
                    this.destroy();
                    const nextState = new LivekitState(this.space, this.peerManager);
                    this.peerManager.setState(nextState);
                }
            })
        );
    
    }

    completeSwitch() {
        //this._peer = this.peerFactory.create(this.space);
    }

    destroy() {
        console.log(">>>> WebRTCState destroy");
        this._peer.closeAllConnections();
        this._peer?.unregister();
        for (const subscription of this.rxJsUnsubscribers) {
            subscription.unsubscribe();
        }
    }

    getPeer(): SimplePeerConnectionInterface | undefined {
        return this._peer;
    }
}
