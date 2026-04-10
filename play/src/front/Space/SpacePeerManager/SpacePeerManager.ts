// -------------------- Default Implementations --------------------x

import Debug from "debug";
import { TimeoutError } from "@workadventure/shared-utils/src/Abort/TimeoutError";
import type { Subscription } from "rxjs";
import { Subject } from "rxjs";
import * as Sentry from "@sentry/svelte";
import type { Readable, Unsubscriber } from "svelte/store";
import { get } from "svelte/store";
import type { SpaceInterface } from "../SpaceInterface";
import type { LocalStreamStoreValue } from "../../Stores/MediaStore";
import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import { recordingStore } from "../../Stores/RecordingStore";
import { screenSharingLocalStreamStore } from "../../Stores/ScreenSharingStore";
import { nbSoundPlayedInBubbleStore } from "../../Stores/ApparentMediaContraintStore";
import { bindMuteEventsToSpace } from "../Utils/BindMuteEvents";
import { recordingSchema } from "../SpaceMetadataValidator";
import { CommunicationType } from "../../Livekit/LivekitConnection";
import { microphoneValidatedForDeviceIdStore } from "../../Stores/MicrophoneValidatedForDeviceIdStore";
import { notificationPlayingStore } from "../../Stores/NotificationStore";
import { audioContextManager } from "../../WebRtc/AudioContextManager";
import LL, { locale } from "../../../i18n/i18n-svelte";
import { gameManager } from "../../Phaser/Game/GameManager";
import type { Streamable } from "../Streamable";
import { raceTimeoutAndCancelTimeout } from "../../Utils/PromiseUtils";
import { DefaultCommunicationState } from "./DefaultCommunicationState";
import { CommunicationMessageType } from "./CommunicationMessageType";
import { WebRTCState } from "./WebRTCState";
import { LivekitState } from "./LivekitState";

export const debug = Debug("SpacePeerManager");
const RECORDER_NAME_TIMEOUT_MS = 5_000;

class RecorderNameResolutionCancelledError extends Error {
    constructor() {
        super("Recorder name resolution was cancelled");
    }
}

interface PendingRecorderNameResolution {
    token: number;
    recorderSpaceUserId: string | null;
    cancel: () => void;
}

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

    /**
     * [DEBUG] Forces the WebSocket/connection to close to test reconnection mechanism.
     * This method is for development/testing purposes only.
     */
    forceWebSocketClose?(): boolean;
}

export interface StreamableSubjects {
    videoPeerAdded: Subject<Streamable>;
    videoPeerRemoved: Subject<Streamable>;
    screenSharingPeerAdded: Subject<Streamable>;
    screenSharingPeerRemoved: Subject<Streamable>;
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

    /**
     * [DEBUG] Forces a connection failure on the first video peer to test retry mechanism.
     * This method is for development/testing purposes only.
     */
    forceFirstPeerFailure(): { userId: string; triggered: boolean } | null;
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

    private readonly _streamableSubjects: StreamableSubjects = {
        videoPeerAdded: this._videoPeerAdded,
        videoPeerRemoved: this._videoPeerRemoved,
        screenSharingPeerAdded: this._screenSharingPeerAdded,
        screenSharingPeerRemoved: this._screenSharingPeerRemoved,
    };

    private metadataSubscription: Subscription;
    private pendingRecorderNameResolutionBySpace = new Map<string, PendingRecorderNameResolution>();
    private nextRecorderNameResolutionToken = 0;

    constructor(
        private space: SpaceInterface,
        blockedUsersStore: Readable<Set<string>>,
        private microphoneStateStore: Readable<boolean> = requestedMicrophoneState,
        private cameraStateStore: Readable<boolean> = requestedCameraState,
        private screenSharingStateStore: Readable<LocalStreamStoreValue> = screenSharingLocalStreamStore,
        _bindMuteEventsToSpace: (space: SpaceInterface) => void = bindMuteEventsToSpace,
        private _notificationPlayingStore = notificationPlayingStore,
        private _recordingStore = recordingStore
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

                // create factory for the new state instead of creating the state directly ?
                if (message.switchMessage.strategy === CommunicationType.WEBRTC) {
                    this._communicationState = new WebRTCState(this.space, this._streamableSubjects, blockedUsersStore);
                } else if (message.switchMessage.strategy === CommunicationType.LIVEKIT) {
                    this._communicationState = new LivekitState(
                        this.space,
                        this._streamableSubjects,
                        blockedUsersStore
                    );
                } else {
                    console.error("Unknown communication strategy: " + message.switchMessage.strategy);
                    Sentry.captureMessage("Unknown communication strategy: " + message.switchMessage.strategy);
                }

                microphoneValidatedForDeviceIdStore.set(undefined);
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

        this.metadataSubscription = this.space.observeMetadataProperty("recording").subscribe((value) => {
            const recording = recordingSchema.safeParse(value);
            const spaceName = this.space.getName();

            if (!recording.success) {
                console.error("Invalid recording metadata", recording.error);
                return;
            }

            // Read enableSounds from WAM file settings (default to true if not specified)
            const enableSounds = gameManager.getCurrentGameScene().wamFile?.settings?.recording?.enableSounds ?? true;

            if (!recording.data.recording) {
                this.cancelPendingRecorderNameResolution(spaceName);
                const currentRecordingState = get(this._recordingStore);
                const recordingForCurrentSpace = currentRecordingState.recordingsBySpace[spaceName];
                const wasRecorder = recordingForCurrentSpace?.isCurrentUserRecorder ?? false;
                this._recordingStore.stopRecord(spaceName);
                // If the user was not the recorder, play the recording complete notification
                // The recorder will have complete popup shown when the recording is stopped
                if (recordingForCurrentSpace && !wasRecorder) {
                    // Play notification that the recording is complete
                    this._notificationPlayingStore.playNotification(
                        get(LL).recording.notification.recordingComplete(),
                        "recording-stop"
                    );
                }
                // Play sound only if enableSounds is true (default to true if not specified)
                if (enableSounds) {
                    this.playRecordingStopSound();
                }
                return;
            }

            this.cancelPendingRecorderNameResolution(spaceName);
            const isRecorder = recording.data.recorder === this.space.mySpaceUserId;
            const recorderSpaceUserId = recording.data.recorder ?? null;
            const recorderName = this.getRecorderName(recorderSpaceUserId);

            this._recordingStore.startRecord(spaceName, isRecorder, recorderSpaceUserId, recorderName);
            // If the user is the recorder, play the recording in progress notification
            // The user will see the recording in progress popup when the recording is started
            if (isRecorder) {
                // Play notification that the user is recording
                this._notificationPlayingStore.playNotification(
                    get(LL).recording.notification.recordingIsInProgress(),
                    "recording-start"
                );
            } else if (recorderName === null) {
                this.resolveRecorderNameWithTimeout(spaceName, recorderSpaceUserId);
            }
            // Play sound only if enableSounds is true (default to true if not specified)
            if (enableSounds) {
                this.playRecordingStartSound();
            }
        });
    }

    private getRecorderName(recorderSpaceUserId: string | null): string | null {
        if (!recorderSpaceUserId) {
            return null;
        }

        return this.space.getSpaceUserBySpaceUserId(recorderSpaceUserId)?.name ?? null;
    }

    private resolveRecorderNameWithTimeout(spaceName: string, recorderSpaceUserId: string | null): void {
        if (recorderSpaceUserId === null) {
            const currentRecordingState = get(this._recordingStore).recordingsBySpace[spaceName];
            if (
                currentRecordingState &&
                !currentRecordingState.isCurrentUserRecorder &&
                currentRecordingState.recorderSpaceUserId === null
            ) {
                this._recordingStore.showGenericInfoPopup();
            }
            return;
        }

        const token = ++this.nextRecorderNameResolutionToken;
        const waitForRecorderNamePromise = this.waitForRecorderName(spaceName, recorderSpaceUserId, token);

        raceTimeoutAndCancelTimeout(waitForRecorderNamePromise, RECORDER_NAME_TIMEOUT_MS)
            .then((resolvedRecorderName) => {
                if (!this.isCurrentRecorderNameResolution(spaceName, token, recorderSpaceUserId)) {
                    return;
                }

                this.clearPendingRecorderNameResolution(spaceName, token);
                this._recordingStore.setRecorderName(spaceName, recorderSpaceUserId, resolvedRecorderName);
            })
            .catch((error) => {
                if (!this.isCurrentRecorderNameResolution(spaceName, token, recorderSpaceUserId)) {
                    return;
                }

                this.cancelPendingRecorderNameResolution(spaceName, token);

                if (error instanceof TimeoutError) {
                    const currentRecordingState = get(this._recordingStore).recordingsBySpace[spaceName];
                    if (
                        currentRecordingState &&
                        !currentRecordingState.isCurrentUserRecorder &&
                        currentRecordingState.recorderSpaceUserId === recorderSpaceUserId
                    ) {
                        this._recordingStore.showGenericInfoPopup();
                    }
                    return;
                }

                if (error instanceof RecorderNameResolutionCancelledError) {
                    return;
                }

                console.warn("Failed to resolve recorder name", error);
            });
    }

    private waitForRecorderName(spaceName: string, recorderSpaceUserId: string | null, token: number): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            let settled = false;
            const subscriptions: Subscription[] = [];

            const finalize = (callback: () => void) => {
                if (settled) {
                    return;
                }
                settled = true;
                subscriptions.forEach((subscription) => subscription.unsubscribe());
                callback();
            };

            const cancel = () => {
                finalize(() => reject(new RecorderNameResolutionCancelledError()));
            };

            if (recorderSpaceUserId === null) {
                cancel();
                return;
            }

            this.pendingRecorderNameResolutionBySpace.set(spaceName, {
                token,
                recorderSpaceUserId,
                cancel,
            });

            const resolveIfUserMatches = (spaceUserId: string) => {
                if (spaceUserId !== recorderSpaceUserId) {
                    return;
                }

                const resolvedRecorderName = this.getRecorderName(recorderSpaceUserId);
                if (!resolvedRecorderName) {
                    return;
                }

                finalize(() => resolve(resolvedRecorderName));
            };

            resolveIfUserMatches(recorderSpaceUserId);
            if (settled) {
                return;
            }

            subscriptions.push(
                this.space.observeUserJoined.subscribe((user) => {
                    resolveIfUserMatches(user.spaceUserId);
                })
            );
            subscriptions.push(
                this.space.observeUserUpdated.subscribe((event) => {
                    resolveIfUserMatches(event.newUser.spaceUserId);
                })
            );
        });
    }

    private isCurrentRecorderNameResolution(
        spaceName: string,
        token: number,
        recorderSpaceUserId: string | null
    ): boolean {
        const pendingResolution = this.pendingRecorderNameResolutionBySpace.get(spaceName);

        return pendingResolution?.token === token && pendingResolution.recorderSpaceUserId === recorderSpaceUserId;
    }

    private clearPendingRecorderNameResolution(spaceName: string, token?: number): void {
        const pendingResolution = this.pendingRecorderNameResolutionBySpace.get(spaceName);
        if (!pendingResolution) {
            return;
        }

        if (token !== undefined && pendingResolution.token !== token) {
            return;
        }

        this.pendingRecorderNameResolutionBySpace.delete(spaceName);
    }

    private cancelPendingRecorderNameResolution(spaceName: string, token?: number): void {
        const pendingResolution = this.pendingRecorderNameResolutionBySpace.get(spaceName);
        if (!pendingResolution) {
            return;
        }

        if (token !== undefined && pendingResolution.token !== token) {
            return;
        }

        this.pendingRecorderNameResolutionBySpace.delete(spaceName);
        pendingResolution.cancel();
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

        this.metadataSubscription.unsubscribe();
        this.cancelPendingRecorderNameResolution(this.space.getName());
        this._recordingStore.removeSpace(this.space.getName());
    }

    getPeer(): SimplePeerConnectionInterface | undefined {
        return this._communicationState.getPeer();
    }

    retryAllFailedConnections(): void {
        this._communicationState.retryAllFailedConnections();
    }

    /**
     * [DEBUG] Forces the WebSocket/connection to close to test reconnection mechanism.
     * This method is for development/testing purposes only.
     * @returns true if the WebSocket was closed, false if no connection exists or method not supported
     */
    forceWebSocketClose(): boolean {
        if (this._communicationState.forceWebSocketClose) {
            return this._communicationState.forceWebSocketClose();
        }
        console.warn("[DEBUG] forceWebSocketClose not supported by current communication state");
        return false;
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
                const audioContext = audioContextManager.getContext();

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

    /**
     * Plays the recording start sound based on the current locale.
     */
    private playRecordingStartSound(): void {
        try {
            const currentLocale = get(locale);
            const audioPath = `./static/audio/recording/${currentLocale}_recording-start.mp3`;
            const audio = new Audio(audioPath);
            audio.volume = 0.1;
            audio.play().catch((error) => {
                console.warn("Error playing recording start sound:", error);
            });
        } catch (error) {
            console.warn("Error initializing recording start sound:", error);
        }
    }

    /**
     * Plays the recording stop sound based on the current locale.
     */
    private playRecordingStopSound(): void {
        try {
            const currentLocale = get(locale);
            const audioPath = `./static/audio/recording/${currentLocale}_recording-end.mp3`;
            const audio = new Audio(audioPath);
            audio.volume = 0.1;
            audio.play().catch((error) => {
                console.warn("Error playing recording stop sound:", error);
            });
        } catch (error) {
            console.warn("Error initializing recording stop sound:", error);
        }
    }
}
