// -------------------- Default Implementations --------------------x

import { Subject } from "rxjs";
import { Readable, Unsubscriber } from "svelte/store";
import { SpaceInterface } from "../SpaceInterface";
import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
import { Streamable } from "../../Stores/StreamableCollectionStore";
import { nbSoundPlayedInBubbleStore } from "../../Stores/ApparentMediaContraintStore";
import { DefaultCommunicationState } from "./DefaultCommunicationState";

export interface ICommunicationState {
    getPeer(): SimplePeerConnectionInterface | undefined;
    destroy(): void;
    completeSwitch(): void;
    shouldSynchronizeMediaState(): boolean;
    dispatchStream(mediaStream: MediaStream): void;
    getVideoForUser(spaceUserId: string): Streamable | undefined;
    getScreenSharingForUser(spaceUserId: string): Streamable | undefined;
    // blockRemoteUser(userId: string): void;
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
    getVideoForUser(spaceUserId: string): Streamable | undefined;
    getScreenSharingForUser(spaceUserId: string): Streamable | undefined;
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

    private readonly _videoPeerAdded = new Subject<Streamable>();
    public readonly videoPeerAdded = this._videoPeerAdded.asObservable();

    private readonly _videoPeerRemoved = new Subject<Streamable>();
    public readonly videoPeerRemoved = this._videoPeerRemoved.asObservable();

    private readonly _screenSharingPeerAdded = new Subject<Streamable>();
    public readonly screenSharingPeerAdded = this._screenSharingPeerAdded.asObservable();

    private readonly _screenSharingPeerRemoved = new Subject<Streamable>();
    public readonly screenSharingPeerRemoved = this._screenSharingPeerRemoved.asObservable();

    private readonly _streamableSubjects = {
        videoPeerAdded: this._videoPeerAdded,
        videoPeerRemoved: this._videoPeerRemoved,
        screenSharingPeerAdded: this._screenSharingPeerAdded,
        screenSharingPeerRemoved: this._screenSharingPeerRemoved,
    };

    constructor(
        private space: SpaceInterface,
        blockedUsersStore: Readable<Set<string>>,
        private microphoneStateStore: Readable<boolean> = requestedMicrophoneState,
        private cameraStateStore: Readable<boolean> = requestedCameraState,
        private screenSharingStateStore: Readable<boolean> = requestedScreenSharingState
    ) {
        this._communicationState = new DefaultCommunicationState(
            this.space,
            this._streamableSubjects,
            blockedUsersStore
        );
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
                this.space.emitUpdateUser({
                    screenSharingState: state,
                });
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
        if (this._communicationState) {
            this._communicationState.destroy();
        }

        for (const unsubscribe of this.unsubscribes) {
            unsubscribe();
        }
    }

    getPeer(): SimplePeerConnectionInterface | undefined {
        return this._communicationState.getPeer();
    }

    setState(state: ICommunicationState): void {
        if (this._communicationState) {
            this._communicationState.destroy();
        }

        if (state.shouldSynchronizeMediaState()) {
            this.synchronizeMediaState();
        } else {
            this.desynchronizeMediaState();
        }

        state.completeSwitch();
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
        return this._communicationState.getVideoForUser(spaceUserId);
    }

    getScreenSharingForUser(spaceUserId: string): Streamable | undefined {
        return this._communicationState.getScreenSharingForUser(spaceUserId);
    }
}
