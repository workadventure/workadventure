import { Subscription } from "rxjs";
import * as Sentry from "@sentry/svelte";
import { Readable } from "svelte/store";
import { CommunicationType, LivekitConnection } from "../../Livekit/LivekitConnection";
import { SpaceInterface } from "../SpaceInterface";
import { Streamable } from "../../Stores/StreamableCollectionStore";
import { SimplePeerConnectionInterface, ICommunicationState, StreamableSubjects } from "./SpacePeerManager";
import { WebRTCState } from "./WebRTCState";
import { CommunicationMessageType } from "./CommunicationMessageType";

export class LivekitState implements ICommunicationState {
    public shouldDisplayRecordButton = true;
    private livekitConnection: LivekitConnection;
    private rxJsUnsubscribers: Subscription[] = [];
    private _nextState: WebRTCState | null = null;
    constructor(
        private _space: SpaceInterface,
        private _streamableSubjects: StreamableSubjects,
        private _blockedUsersStore: Readable<Set<string>>
    ) {
        this.livekitConnection = new LivekitConnection(this._space, this._streamableSubjects, this._blockedUsersStore);

        this.rxJsUnsubscribers.push(
            this._space.observePrivateEvent(CommunicationMessageType.PREPARE_SWITCH_MESSAGE).subscribe((message) => {
                if (message.prepareSwitchMessage.strategy === CommunicationType.WEBRTC) {
                    this._nextState = new WebRTCState(this._space, this._streamableSubjects, this._blockedUsersStore);
                }
            })
        );

        this.rxJsUnsubscribers.push(
            this._space.observePrivateEvent(CommunicationMessageType.EXECUTE_SWITCH_MESSAGE).subscribe((message) => {
                if (message.executeSwitchMessage.strategy === CommunicationType.WEBRTC) {
                    if (!this._nextState) {
                        console.error("Next state is null");
                        return;
                    }

                    this._space.spacePeerManager.setState(this._nextState);
                    this._nextState = null;
                }
            })
        );

        this.rxJsUnsubscribers.push(
            this._space
                .observePrivateEvent(CommunicationMessageType.COMMUNICATION_STRATEGY_MESSAGE)
                .subscribe((message) => {
                    if (message.communicationStrategyMessage.strategy === CommunicationType.WEBRTC) {
                        const nextState = new WebRTCState(
                            this._space,
                            this._streamableSubjects,
                            this._blockedUsersStore
                        );
                        this._space.spacePeerManager.setState(nextState);
                    }
                })
        );

        this.rxJsUnsubscribers.push(
            this._space.observePrivateEvent(CommunicationMessageType.CANCEL_SWITCH_MESSAGE).subscribe((message) => {
                if (message.cancelSwitchMessage.strategy === CommunicationType.WEBRTC && this._nextState) {
                    this._nextState.destroy();
                    this._nextState = null;
                }
            })
        );
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

    dispatchStream(mediaStream: MediaStream): void {
        this.livekitConnection.dispatchStream(mediaStream).catch((err) => {
            console.error("An error occurred in dispatchStream", err);
            Sentry.captureException(err);
        });
    }

    getVideoForUser(spaceUserId: string): Streamable | undefined {
        return this.livekitConnection.getVideoForUser(spaceUserId);
    }

    getScreenSharingForUser(spaceUserId: string): Streamable | undefined {
        return this.livekitConnection.getScreenSharingForUser(spaceUserId);
    }
}
