import { Subscription } from "rxjs";
import { SpaceInterface } from "../SpaceInterface";
import { CommunicationType } from "../../Livekit/LivekitConnection";
import { SimplePeerConnectionInterface, ICommunicationState } from "./SpacePeerManager";
import { CommunicationMessageType, LivekitState } from "./LivekitState";
import { WebRTCState } from "./WebRTCState";

export class DefaultCommunicationState implements ICommunicationState {
    private rxJsUnsubscribers: Subscription[] = [];
    constructor(private space: SpaceInterface) {
        
        this.rxJsUnsubscribers.push(
            this.space
                .observePrivateEvent(CommunicationMessageType.COMMUNICATION_STRATEGY_MESSAGE)
                .subscribe((message) => {
                    
                    if (message.communicationStrategyMessage.strategy === CommunicationType.WEBRTC) {
                        const nextState = new WebRTCState(this.space);
                        this.space.spacePeerManager.setState(nextState);
                    }
                    if (message.communicationStrategyMessage.strategy === CommunicationType.LIVEKIT) {
                        const nextState = new LivekitState(this.space);
                        this.space.spacePeerManager.setState(nextState);
                    }
                })
        );
    }

    completeSwitch() {}

    destroy() {}

    getPeer(): SimplePeerConnectionInterface | undefined {
        return undefined;
    }

    shouldSynchronizeMediaState(): boolean {
        return false;
    }
}
