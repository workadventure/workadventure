import { Subscription } from "rxjs";
import { CommunicationType, LivekitConnection } from "../../Livekit/LivekitConnection";
import { SpaceInterface } from "../SpaceInterface";
import { SimplePeerConnectionInterface, SpacePeerManager, ICommunicationState } from "./SpacePeerManager";
import { WebRTCState } from "./WebRTCState";

//TODO : move in a common file / à séparer en messageSwitch et messageLivekit ?
export enum CommunicationMessageType {
    PREPARE_SWITCH_MESSAGE = "prepareSwitchMessage",
    EXECUTE_SWITCH_MESSAGE = "executeSwitchMessage",
    COMMUNICATION_STRATEGY_MESSAGE = "communicationStrategyMessage",
    LIVEKIT_INVITATION_MESSAGE = "livekitInvitationMessage",
    LIVEKIT_DISCONNECT_MESSAGE = "livekitDisconnectMessage",
}

export class LivekitState implements ICommunicationState {
    private livekitConnection: LivekitConnection;
    private rxJsUnsubscribers: Subscription[] = [];
    private _nextState: WebRTCState | null = null;
    constructor(private space: SpaceInterface, private peerManager: SpacePeerManager) {
        this.livekitConnection = new LivekitConnection(this.space);

        this.rxJsUnsubscribers.push(
            this.space.observePrivateEvent(CommunicationMessageType.PREPARE_SWITCH_MESSAGE).subscribe((message) => {
                if (message.prepareSwitchMessage.strategy === CommunicationType.WEBRTC) {
                    this._nextState = new WebRTCState(this.space, this.peerManager);
                }
            })
        );

        this.rxJsUnsubscribers.push(
            this.space.observePrivateEvent(CommunicationMessageType.EXECUTE_SWITCH_MESSAGE).subscribe((message) => {
                if (message.executeSwitchMessage.strategy === CommunicationType.WEBRTC) {
                    if (!this._nextState) {
                        //throw new Error("Next state is null");
                        console.error("Next state is null");
                        return;
                    }
                    // TODO: determine if destroy() should be called here or at the end of the switch
                    this.destroy();
                    this._nextState?.completeSwitch();
                    this.peerManager.setState(this._nextState);
                }
            })
        );

        this.rxJsUnsubscribers.push(
            this.space
                .observePrivateEvent(CommunicationMessageType.COMMUNICATION_STRATEGY_MESSAGE)
                .subscribe((message) => {
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
        this.livekitConnection.destroy();
        for (const subscription of this.rxJsUnsubscribers) {
            subscription.unsubscribe();
        }
    }

    getPeer(): SimplePeerConnectionInterface | undefined {
        return undefined;
    }
}
