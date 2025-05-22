import { Subscription } from "rxjs";
import { SpaceInterface } from "../SpaceInterface";
import { CommunicationType } from "../../Livekit/LivekitConnection";
import { SimplePeerConnectionInterface, ICommunicationState } from "./SpacePeerManager";
import { CommunicationMessageType, LivekitState } from "./LivekitState";
import { WebRTCState } from "./WebRTCState";

export class DefaultCommunicationState implements ICommunicationState {
    private rxJsUnsubscribers: Subscription[] = [];
    constructor(private space: SpaceInterface) {
        // this.rxJsUnsubscribers.push(
        //     this.space.observePrivateEvent(CommunicationMessageType.PREPARE_SWITCH_MESSAGE).subscribe((message) => {
        //         if (message.prepareSwitchMessage.strategy === CommunicationType.WEBRTC) {
        //             this._nextState = new WebRTCState(this.space);
        //         }
        //     })
        // );

        // this.rxJsUnsubscribers.push(
        //     this.space.observePrivateEvent(CommunicationMessageType.EXECUTE_SWITCH_MESSAGE).subscribe((message) => {
        //         if (message.executeSwitchMessage.strategy === CommunicationType.WEBRTC) {
        //             if (!this._nextState) {
        //                 //throw new Error("Next state is null");
        //                 console.error("Next state is null");
        //                 return;
        //             }
        //             // TODO: determine if destroy() should be called here or at the end of the switch
        //             this.space.spacePeerManager.setState(this._nextState);
        //         }
        //     })
        // );

        this.rxJsUnsubscribers.push(
            this.space
                .observePrivateEvent(CommunicationMessageType.COMMUNICATION_STRATEGY_MESSAGE)
                .subscribe((message) => {
                    console.log(
                        ">>>>>>> get first communicationType communicationStrategyMessage",
                        message.communicationStrategyMessage.strategy
                    );
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
