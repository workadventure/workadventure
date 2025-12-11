// -------------------- Default Implementations --------------------x

import Debug from "debug";
import { Subject, Subscription } from "rxjs";
import * as Sentry from "@sentry/svelte";
import { Readable, Unsubscriber } from "svelte/store";
import { SpaceInterface } from "../SpaceInterface";
import { LocalStreamStoreValue, requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import { screenSharingLocalStreamStore } from "../../Stores/ScreenSharingStore";
import { Streamable } from "../../Stores/StreamableCollectionStore";
import { nbSoundPlayedInBubbleStore } from "../../Stores/ApparentMediaContraintStore";
import { bindMuteEventsToSpace } from "../Utils/BindMuteEvents";
import { CommunicationType } from "../../Livekit/LivekitConnection";
import { DefaultCommunicationState } from "./DefaultCommunicationState";
import { CommunicationMessageType } from "./CommunicationMessageType";
import { WebRTCState } from "./WebRTCState";
import { LivekitState } from "./LivekitState";

export const debug = Debug("SpacePeerManager");

export interface ICommunicationState {
    getPeer(): SimplePeerConnectionInterface | undefined;

    /**
     * Starts the shutdown process of the communication state. It does not remove all video peers immediately,
     * but any asynchronous operation receiving a new stream should be ignored after this call.
     */
    shutdown(): void;
    destroy(): void;
    shouldSynchronizeMediaState(): boolean;
    dispatchStream(mediaStream: MediaStream): void;
    /**
     * Retries all failed connections
     */
    retryAllFailedConnections(): void;
    // blockRemoteUser(userId: string): void;
}

export type FailedConnectionEvent = { type: "add" | "remove"; userId: string } | { type: "reset" };

export type ReconnectingConnectionEvent = { type: "add" | "remove"; userId: string } | { type: "reset" };

export type PersistentIssueConnectionEvent = { type: "add" | "remove"; userId: string } | { type: "reset" };

export interface StreamableSubjects {
    videoPeerAdded: Subject<Streamable>;
    videoPeerRemoved: Subject<Streamable>;
    screenSharingPeerAdded: Subject<Streamable>;
    screenSharingPeerRemoved: Subject<Streamable>;
    failedConnectionsChanged: Subject<FailedConnectionEvent>;
    reconnectingConnectionsChanged: Subject<ReconnectingConnectionEvent>;
    persistentIssueConnectionsChanged: Subject<PersistentIssueConnectionEvent>;
}

export interface SimplePeerConnectionInterface {
    blockedFromRemotePlayer(userId: string): void;
    destroy(): void;
    dispatchStream(mediaStream: MediaStream): void;

    /**
     * Starts the shutdown process of the communication state. It does not remove all video peers immediately,
     * but any asynchronous operation receiving a new stream should be ignored after this call.
     */
    shutdown(): void;

    /**
     * Retries a failed connection for a specific user
     */
    retryConnection(userId: string): void;

    /**
     * Retries all failed connections
     */
    retryAllFailedConnections(): void;

    /**
     * Checks if a connection has failed (reached retry limit)
     */
    isConnectionFailed(userId: string): boolean;

    /**
     * Gets the set of all failed connection user IDs
     */
    getFailedConnections(): ReadonlySet<string>;
}

export interface PeerFactoryInterface {
    create(
        space: SpaceInterface,
        streamableSubjects: StreamableSubjects,
        blockedUsersStore: Readable<Set<string>>
    ): SimplePeerConnectionInterface;
}
export class SpacePeerManager {
    private unsubscribes: Unsubscriber[] = [];

    private _communicationState: ICommunicationState;
    private _toFinalizeState: ICommunicationState | undefined;

    private readonly _videoPeerAdded = new Subject<Streamable>();
    public readonly videoPeerAdded = this._videoPeerAdded.asObservable();

    private readonly _videoPeerRemoved = new Subject<Streamable>();
    public readonly videoPeerRemoved = this._videoPeerRemoved.asObservable();

    private readonly videoPeers: Map<string, Streamable> = new Map();

    private readonly _screenSharingPeerAdded = new Subject<Streamable>();
    public readonly screenSharingPeerAdded = this._screenSharingPeerAdded.asObservable();

    private readonly _screenSharingPeerRemoved = new Subject<Streamable>();
    public readonly screenSharingPeerRemoved = this._screenSharingPeerRemoved.asObservable();

    private readonly screenSharingPeers: Map<string, Streamable> = new Map();

    private rxJsUnsubscribers: Subscription[] = [];

    private readonly _failedConnectionsChanged = new Subject<FailedConnectionEvent>();
    public readonly failedConnectionsChanged = this._failedConnectionsChanged.asObservable();

    private readonly _reconnectingConnectionsChanged = new Subject<ReconnectingConnectionEvent>();
    public readonly reconnectingConnectionsChanged = this._reconnectingConnectionsChanged.asObservable();

    private readonly _persistentIssueConnectionsChanged = new Subject<PersistentIssueConnectionEvent>();
    public readonly persistentIssueConnectionsChanged = this._persistentIssueConnectionsChanged.asObservable();

    private readonly _streamableSubjects = {
        videoPeerAdded: this._videoPeerAdded,
        videoPeerRemoved: this._videoPeerRemoved,
        screenSharingPeerAdded: this._screenSharingPeerAdded,
        screenSharingPeerRemoved: this._screenSharingPeerRemoved,
        failedConnectionsChanged: this._failedConnectionsChanged,
        reconnectingConnectionsChanged: this._reconnectingConnectionsChanged,
        persistentIssueConnectionsChanged: this._persistentIssueConnectionsChanged,
    };

    constructor(
        private space: SpaceInterface,
        blockedUsersStore: Readable<Set<string>>,
        private microphoneStateStore: Readable<boolean> = requestedMicrophoneState,
        private cameraStateStore: Readable<boolean> = requestedCameraState,
        private screenSharingStateStore: Readable<LocalStreamStoreValue> = screenSharingLocalStreamStore,
        _bindMuteEventsToSpace: (space: SpaceInterface) => void = bindMuteEventsToSpace
    ) {
        this._communicationState = new DefaultCommunicationState();

        this.rxJsUnsubscribers.push(
            this.space.observePrivateEvent(CommunicationMessageType.SWITCH_MESSAGE).subscribe((message) => {
                debug("Switching communication strategy to " + message.switchMessage.strategy);
                console.warn("Switching communication strategy to " + message.switchMessage.strategy);
                if (this._toFinalizeState && !(this._toFinalizeState instanceof DefaultCommunicationState)) {
                    console.error(
                        "A state is already pending finalization. The back should have send us a finalize message before."
                    );
                    Sentry.captureMessage(
                        "A state is already pending finalization. The back should have send us a finalize message before."
                    );
                }
                this._toFinalizeState = this._communicationState;
                this._toFinalizeState.shutdown();
                if (message.switchMessage.strategy === CommunicationType.WEBRTC) {
                    this._communicationState = new WebRTCState(this.space, this._streamableSubjects, blockedUsersStore);
                    // Reset connection states when switching to WebRTC
                    this._failedConnectionsChanged.next({ type: "reset" });
                    this._reconnectingConnectionsChanged.next({ type: "reset" });
                    this._persistentIssueConnectionsChanged.next({ type: "reset" });
                } else if (message.switchMessage.strategy === CommunicationType.LIVEKIT) {
                    this._communicationState = new LivekitState(
                        this.space,
                        this._streamableSubjects,
                        blockedUsersStore
                    );
                    // Reset connection states when switching to LiveKit
                    this._failedConnectionsChanged.next({ type: "reset" });
                    this._reconnectingConnectionsChanged.next({ type: "reset" });
                    this._persistentIssueConnectionsChanged.next({ type: "reset" });
                } else {
                    console.error("Unknown communication strategy: " + message.switchMessage.strategy);
                    Sentry.captureMessage("Unknown communication strategy: " + message.switchMessage.strategy);
                }

                this.setState(this._communicationState);
            })
        );

        this.rxJsUnsubscribers.push(
            this.space.observePrivateEvent(CommunicationMessageType.FINALIZE_SWITCH_MESSAGE).subscribe((message) => {
                debug("Finalizing previous communication strategy " + message.finalizeSwitchMessage.strategy);
                if (!this._toFinalizeState) {
                    console.error(
                        "No state is pending finalization. The back should have send us a switch message before."
                    );
                    Sentry.captureMessage(
                        "No state is pending finalization. The back should have send us a switch message before."
                    );
                    return;
                }

                this._toFinalizeState.destroy();
                this._toFinalizeState = undefined;
            })
        );

        this.rxJsUnsubscribers.push(
            this.videoPeerAdded.subscribe((streamable) => {
                if (streamable.spaceUserId === undefined) {
                    throw new Error("Received a video peer with undefined spaceUserId");
                }
                this.videoPeers.set(streamable.spaceUserId, streamable);
            })
        );

        this.rxJsUnsubscribers.push(
            this.videoPeerRemoved.subscribe((streamable) => {
                if (streamable.spaceUserId === undefined) {
                    throw new Error("Received a video peer with undefined spaceUserId");
                }
                this.videoPeers.delete(streamable.spaceUserId);
            })
        );

        this.rxJsUnsubscribers.push(
            this.screenSharingPeerAdded.subscribe((streamable) => {
                if (streamable.spaceUserId === undefined) {
                    throw new Error("Received a screen-sharing peer with undefined spaceUserId");
                }
                this.screenSharingPeers.set(streamable.spaceUserId, streamable);
            })
        );

        this.rxJsUnsubscribers.push(
            this.screenSharingPeerRemoved.subscribe((streamable) => {
                if (streamable.spaceUserId === undefined) {
                    throw new Error("Received a screen-sharing peer with undefined spaceUserId");
                }
                this.screenSharingPeers.delete(streamable.spaceUserId);
            })
        );

        _bindMuteEventsToSpace(this.space);
    }
    private synchronizeMediaState(): void {
        if (this.isMediaStateSynchronized()) return;

        this.unsubscribes.push(
            this.microphoneStateStore.subscribe((state) => {
                this.space.emitUpdateUser({
                    microphoneState: state,
                });
            })
        );
        this.unsubscribes.push(
            this.cameraStateStore.subscribe((state) => {
                this.space.emitUpdateUser({
                    cameraState: state,
                });
            })
        );

        this.unsubscribes.push(
            this.screenSharingStateStore.subscribe((state) => {
                if (state.type === "success" && state.stream) {
                    this.space.emitUpdateUser({
                        screenSharingState: true,
                    });
                } else {
                    this.space.emitUpdateUser({
                        screenSharingState: false,
                    });
                }
            })
        );
    }

    private desynchronizeMediaState(): void {
        if (!this.isMediaStateSynchronized()) return;

        this.unsubscribes.forEach((unsubscribe) => {
            unsubscribe();
        });
        this.unsubscribes = [];
    }

    private isMediaStateSynchronized(): boolean {
        return this.unsubscribes.length > 0;
    }

    destroy(): void {
        if (this._toFinalizeState) {
            this._toFinalizeState.destroy();
        }

        if (this._communicationState) {
            this._communicationState.destroy();
        }

        for (const unsubscribe of this.unsubscribes) {
            unsubscribe();
        }
        for (const subscription of this.rxJsUnsubscribers) {
            subscription.unsubscribe();
        }
    }

    getPeer(): SimplePeerConnectionInterface | undefined {
        return this._communicationState.getPeer();
    }

    retryAllFailedConnections(): void {
        this._communicationState.retryAllFailedConnections();
    }

    private setState(state: ICommunicationState): void {
        if (state.shouldSynchronizeMediaState()) {
            this.synchronizeMediaState();
        } else {
            this.desynchronizeMediaState();
        }

        this._communicationState = state;
        if (this.currentMediaStream) {
            // If we have a current media stream, we need to dispatch it to the new state
            this._communicationState.dispatchStream(this.currentMediaStream);
        }
    }

    dispatchSound(url: URL): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            (async () => {
                const audioContext = new AudioContext();

                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const destination = audioContext.createMediaStreamDestination();
                const bufferSource = audioContext.createBufferSource();
                bufferSource.buffer = audioBuffer;
                bufferSource.start(0);
                bufferSource.connect(destination);
                bufferSource.onended = () => {
                    nbSoundPlayedInBubbleStore.soundEnded();
                    resolve();
                };
                nbSoundPlayedInBubbleStore.soundStarted();

                return this._communicationState.dispatchStream(destination.stream);
            })().catch(reject);
        });
    }

    private currentMediaStream: MediaStream | undefined;

    dispatchStream(mediaStream: MediaStream): void {
        this.currentMediaStream = mediaStream;
        this._communicationState.dispatchStream(mediaStream);
    }

    getVideoForUser(spaceUserId: string): Streamable | undefined {
        return this.videoPeers.get(spaceUserId);
    }

    getScreenSharingForUser(spaceUserId: string): Streamable | undefined {
        return this.screenSharingPeers.get(spaceUserId);
    }
}
