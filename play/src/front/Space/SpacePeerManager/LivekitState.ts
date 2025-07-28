import { Subscription } from "rxjs";
import * as Sentry from "@sentry/svelte";
import { CommunicationType, LivekitConnection } from "../../Livekit/LivekitConnection";
import { SpaceInterface } from "../SpaceInterface";
import { SimplePeerConnectionInterface, ICommunicationState, StreamableSubjects } from "./SpacePeerManager";
import { WebRTCState } from "./WebRTCState";
import { CommunicationMessageType } from "./CommunicationMessageType";

export class LivekitState implements ICommunicationState {
    private livekitConnection: LivekitConnection;
    private rxJsUnsubscribers: Subscription[] = [];
    private _nextState: WebRTCState | null = null;
    constructor(private _space: SpaceInterface, private _streamableSubjects: StreamableSubjects) {
        this.livekitConnection = new LivekitConnection(this._space, this._streamableSubjects);

        this.rxJsUnsubscribers.push(
            this._space.observePrivateEvent(CommunicationMessageType.PREPARE_SWITCH_MESSAGE).subscribe((message) => {
                if (message.prepareSwitchMessage.strategy === CommunicationType.WEBRTC) {
                    this._nextState = new WebRTCState(this._space, this._streamableSubjects);
                }
            })
        );

        this.rxJsUnsubscribers.push(
            this._space.observePrivateEvent(CommunicationMessageType.EXECUTE_SWITCH_MESSAGE).subscribe((message) => {
                if (message.executeSwitchMessage.strategy === CommunicationType.WEBRTC) {
                    if (!this._nextState) {
                        //TODO : voir si on peut throw une erreur ici
                        //throw new Error("Next state is null");
                        console.error("Next state is null");
                        return;
                    }

                    this._space.spacePeerManager.setState(this._nextState);
                }
            })
        );

        //TODO : voir si on ajoute les event pour gerer les 2 tokens ici

        this.rxJsUnsubscribers.push(
            this._space
                .observePrivateEvent(CommunicationMessageType.COMMUNICATION_STRATEGY_MESSAGE)
                .subscribe((message) => {
                    if (message.communicationStrategyMessage.strategy === CommunicationType.WEBRTC) {
                        const nextState = new WebRTCState(this._space, this._streamableSubjects);
                        this._space.spacePeerManager.setState(nextState);
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

    dispatchStream(mediaStream: MediaStream): void {
        this.livekitConnection.dispatchStream(mediaStream).catch((err) => {
            console.error("An error occurred in dispatchStream", err);
            Sentry.captureException(err);
        });
    }
}
