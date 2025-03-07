import { Subscription } from "rxjs";
import { CommunicationType } from "../../Livekit/LivekitConnection";
import { LivekitConnection } from "../../Livekit/LivekitConnection";
import { SpaceInterface } from "../SpaceInterface";
import { SimplePeerConnectionInterface, SpacePeerManager } from "./SpacePeerManager";
import { ICommunicationState } from "./SpacePeerManager";
import { WebRTCState } from "./WebRTCState";

export class LivekitState implements ICommunicationState {

    private livekitConnection: LivekitConnection;
    private rxJsUnsubscribers: Subscription[] = [];
    private _nextState: WebRTCState | null = null;
    constructor(private space: SpaceInterface, private peerManager: SpacePeerManager) {
        this.livekitConnection = new LivekitConnection(this.space);
        console.log(">>>> LivekitState constructor");

        this.rxJsUnsubscribers.push(
            this.space.observePrivateEvent("prepareSwitchMessage").subscribe((message) => {
                //TODO : passer la strategy dans le message 
                console.log(">>>> LivekitState prepareSwitchMessage to WEBRTC", message);
                if(message.prepareSwitchMessage.strategy === CommunicationType.WEBRTC) {
                    this._nextState = new WebRTCState(this.space, this.peerManager);
                }
            })
        );

        this.rxJsUnsubscribers.push(
            this.space.observePrivateEvent("executeSwitchMessage").subscribe((message) => {
                if (message.executeSwitchMessage.strategy === CommunicationType.WEBRTC) {
                    this.livekitConnection.destroy();
                    console.log(">>>> LivekitState executeSwitchMessage to WEBRTC", message);
                    if(!this._nextState) {
                        //throw new Error("Next state is null");
                        console.error("Next state is null");
                        return;
                    }
                    
                    this._nextState?.completeSwitch();
                    this.peerManager.setState(this._nextState);
                }
            })
        );
        
        this.rxJsUnsubscribers.push(
            this.space.observePrivateEvent("communicationStrategyMessage").subscribe((message) => {
                console.log(">>>>> communicationStrategyMessage", message);
                if (message.communicationStrategyMessage.strategy === CommunicationType.WEBRTC) {
                    this.destroy();
                    const nextState = new WebRTCState(this.space, this.peerManager);
                    this.peerManager.setState(nextState);
                }
            })
        );
    }

    completeSwitch() {
        this.livekitConnection.joinRoom();  
    }

    destroy() {
        console.log(">>>> LivekitState destroy");
        this.livekitConnection.destroy();
        for (const subscription of this.rxJsUnsubscribers) {
            subscription.unsubscribe();
        }
    }

    getPeer(): SimplePeerConnectionInterface | undefined {
        return undefined;
    }
}