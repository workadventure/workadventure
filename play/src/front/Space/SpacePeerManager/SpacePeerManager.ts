// -------------------- Default Implementations --------------------x

import { Subject } from "rxjs";
import { Readable, Unsubscriber } from "svelte/store";
import { SpaceInterface } from "../SpaceInterface";
import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
import { MediaStoreStreamable } from "../../Stores/StreamableCollectionStore";
import { DefaultCommunicationState } from "./DefaultCommunicationState";

export interface ICommunicationState {
    getPeer(): SimplePeerConnectionInterface | undefined;
    destroy(): void;
    completeSwitch(): void;
    shouldSynchronizeMediaState(): boolean;
    dispatchSound(url: URL): Promise<void>;
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
    dispatchSound(url: URL): Promise<void>;
}

export interface PeerFactoryInterface {
    create(space: SpaceInterface, streamableSubjects: StreamableSubjects): SimplePeerConnectionInterface;
}
export class SpacePeerManager {
    private unsubscribes: Unsubscriber[] = [];
    private _communicationState: ICommunicationState;
    public videoContainerMap: Map<string, HTMLVideoElement[]> = new Map<string, HTMLVideoElement[]>();
    public screenShareContainerMap: Map<string, HTMLVideoElement[]> = new Map<string, HTMLVideoElement[]>();

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
    }

    dispatchSound(url: URL): Promise<void> {
        return this._communicationState.dispatchSound(url);
    }

    dispatchStream(mediaStream: MediaStream): void {
        this._communicationState.dispatchStream(mediaStream);
    }
}
