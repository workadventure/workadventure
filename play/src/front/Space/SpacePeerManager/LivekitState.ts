import { Subscription } from "rxjs";
import * as Sentry from "@sentry/svelte";
import { CommunicationType, LivekitConnection } from "../../Livekit/LivekitConnection";
import { SpaceInterface } from "../SpaceInterface";
import { SimplePeerConnectionInterface, ICommunicationState } from "./SpacePeerManager";
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
    constructor(private space: SpaceInterface) {
        this.livekitConnection = new LivekitConnection(this.space);

        this.rxJsUnsubscribers.push(
            this.space.observePrivateEvent(CommunicationMessageType.PREPARE_SWITCH_MESSAGE).subscribe((message) => {
                if (message.prepareSwitchMessage.strategy === CommunicationType.WEBRTC) {
                    this._nextState = new WebRTCState(this.space);
                }
            })
        );

        this.rxJsUnsubscribers.push(
            this.space.observePrivateEvent(CommunicationMessageType.EXECUTE_SWITCH_MESSAGE).subscribe((message) => {
                if (message.executeSwitchMessage.strategy === CommunicationType.WEBRTC) {
                    if (!this._nextState) {
                        //TODO : voir si on peut throw une erreur ici
                        //throw new Error("Next state is null");
                        console.error("Next state is null");
                        return;
                    }

                    this.space.spacePeerManager.setState(this._nextState);
                    console.log("switch back to webrtc");
                }
            })
        );

        this.rxJsUnsubscribers.push(
            this.space
                .observePrivateEvent(CommunicationMessageType.COMMUNICATION_STRATEGY_MESSAGE)
                .subscribe((message) => {
                    if (message.communicationStrategyMessage.strategy === CommunicationType.WEBRTC) {
                        const nextState = new WebRTCState(this.space);
                        this.space.spacePeerManager.setState(nextState);
                    }
                })
        );
    }

    completeSwitch() {
        this.livekitConnection.joinRoom().catch((err) => {
            console.error("An error occurred in executeSwitchMessage", err);
            Sentry.captureException(err);
        });
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

    shouldSynchronizeMediaState(): boolean {
        return true;
    }

    dispatchSound(url: URL): Promise<void> {
        return this.livekitConnection.dispatchSound(url);
    }
}
