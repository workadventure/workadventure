// -------------------- Default Implementations --------------------x

import { Subject } from "rxjs";
import { Readable, Unsubscriber } from "svelte/store";
import { SpaceInterface } from "../SpaceInterface";
import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
import { MediaStoreStreamable } from "../../Stores/StreamableCollectionStore";
import { nbSoundPlayedInBubbleStore } from "../../Stores/ApparentMediaContraintStore";
import { DefaultCommunicationState } from "./DefaultCommunicationState";

export interface ICommunicationState {
    getPeer(): SimplePeerConnectionInterface | undefined;
    destroy(): void;
    completeSwitch(): void;
    shouldSynchronizeMediaState(): boolean;
    dispatchStream(mediaStream: MediaStream): void;
}

export interface StreamableSubjects {
    videoPeerAdded: Subject<MediaStoreStreamable>;
    videoPeerRemoved: Subject<MediaStoreStreamable>;
    screenSharingPeerAdded: Subject<MediaStoreStreamable>;
    screenSharingPeerRemoved: Subject<MediaStoreStreamable>;
}

export interface SimplePeerConnectionInterface {
    closeAllConnections(needToDelete?: boolean): void;
    blockedFromRemotePlayer(userId: string): void;
    unregister(): void;
    dispatchStream(mediaStream: MediaStream): void;
    cleanupStore(): void;
    removePeer(userId: string): void;
}

export interface PeerFactoryInterface {
    create(space: SpaceInterface, streamableSubjects: StreamableSubjects): SimplePeerConnectionInterface;
}
export class SpacePeerManager {
    private unsubscribes: Unsubscriber[] = [];
    private _communicationState: ICommunicationState;
    private videoContainerMap: Map<string, HTMLVideoElement[]> = new Map<string, HTMLVideoElement[]>();
    private audioContainerMap: Map<string, HTMLAudioElement[]> = new Map<string, HTMLAudioElement[]>();
    private screenShareContainerMap: Map<string, HTMLVideoElement[]> = new Map<string, HTMLVideoElement[]>();
    private screenShareAudioContainerMap: Map<string, HTMLAudioElement[]> = new Map<string, HTMLAudioElement[]>();

    private readonly _videoPeerAdded = new Subject<MediaStoreStreamable>();
    public readonly videoPeerAdded = this._videoPeerAdded.asObservable();

    private readonly _videoPeerRemoved = new Subject<MediaStoreStreamable>();
    public readonly videoPeerRemoved = this._videoPeerRemoved.asObservable();

    private readonly _screenSharingPeerAdded = new Subject<MediaStoreStreamable>();
    public readonly screenSharingPeerAdded = this._screenSharingPeerAdded.asObservable();

    private readonly _screenSharingPeerRemoved = new Subject<MediaStoreStreamable>();
    public readonly screenSharingPeerRemoved = this._screenSharingPeerRemoved.asObservable();

    private readonly _streamableSubjects = {
        videoPeerAdded: this._videoPeerAdded,
        videoPeerRemoved: this._videoPeerRemoved,
        screenSharingPeerAdded: this._screenSharingPeerAdded,
        screenSharingPeerRemoved: this._screenSharingPeerRemoved,
    };

    constructor(
        private space: SpaceInterface,
        private microphoneStateStore: Readable<boolean> = requestedMicrophoneState,
        private cameraStateStore: Readable<boolean> = requestedCameraState,
        private screenSharingStateStore: Readable<boolean> = requestedScreenSharingState
    ) {
        this._communicationState = new DefaultCommunicationState(this.space, this._streamableSubjects);
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

    public registerVideoContainer(spaceUserId: string, videoElement: HTMLVideoElement): void {
        const videoElements = this.videoContainerMap.get(spaceUserId) || [];
        videoElements.push(videoElement);
        this.videoContainerMap.set(spaceUserId, videoElements);
    }

    public registerAudioContainer(spaceUserId: string, audioElement: HTMLAudioElement): void {
        const audioElements = this.audioContainerMap.get(spaceUserId) || [];
        audioElements.push(audioElement);
        this.audioContainerMap.set(spaceUserId, audioElements);
    }

    public registerScreenShareContainer(spaceUserId: string, videoElement: HTMLVideoElement): void {
        const videoElements = this.screenShareContainerMap.get(spaceUserId) || [];
        videoElements.push(videoElement);
        this.screenShareContainerMap.set(spaceUserId, videoElements);
    }

    public registerScreenShareAudioContainer(spaceUserId: string, audioElement: HTMLAudioElement): void {
        const audioElements = this.screenShareAudioContainerMap.get(spaceUserId) || [];
        audioElements.push(audioElement);
        this.screenShareAudioContainerMap.set(spaceUserId, audioElements);
    }

    public unregisterVideoContainer(spaceUserId: string, videoElement: HTMLVideoElement): void {
        let videoElements = this.videoContainerMap.get(spaceUserId) || [];
        videoElements = videoElements.filter((element) => element !== videoElement);
        if (videoElements.length === 0) {
            this.videoContainerMap.delete(spaceUserId);
        } else {
            this.videoContainerMap.set(spaceUserId, videoElements);
        }
    }

    public unregisterAudioContainer(spaceUserId: string, audioElement: HTMLAudioElement): void {
        let audioElements = this.audioContainerMap.get(spaceUserId) || [];
        audioElements = audioElements.filter((element) => element !== audioElement);
        if (audioElements.length === 0) {
            this.audioContainerMap.delete(spaceUserId);
        } else {
            this.audioContainerMap.set(spaceUserId, audioElements);
        }
    }

    public unregisterScreenShareContainer(spaceUserId: string, videoElement: HTMLVideoElement): void {
        let videoElements = this.screenShareContainerMap.get(spaceUserId) || [];
        videoElements = videoElements.filter((element) => element !== videoElement);
        if (videoElements.length === 0) {
            this.screenShareContainerMap.delete(spaceUserId);
        } else {
            this.screenShareContainerMap.set(spaceUserId, videoElements);
        }
    }

    public unregisterScreenShareAudioContainer(spaceUserId: string, audioElement: HTMLAudioElement): void {
        let audioElements = this.screenShareAudioContainerMap.get(spaceUserId) || [];
        audioElements = audioElements.filter((element) => element !== audioElement);
        if (audioElements.length === 0) {
            this.screenShareAudioContainerMap.delete(spaceUserId);
        } else {
            this.screenShareAudioContainerMap.set(spaceUserId, audioElements);
        }
    }

    public getVideoContainers(spaceUserId: string): HTMLVideoElement[] {
        return this.videoContainerMap.get(spaceUserId) || [];
    }

    public getAudioContainers(spaceUserId: string): HTMLAudioElement[] {
        return this.audioContainerMap.get(spaceUserId) || [];
    }

    public getScreenShareContainers(spaceUserId: string): HTMLVideoElement[] {
        return this.screenShareContainerMap.get(spaceUserId) || [];
    }

    public getScreenShareAudioContainers(spaceUserId: string): HTMLAudioElement[] {
        return this.screenShareAudioContainerMap.get(spaceUserId) || [];
    }
}
