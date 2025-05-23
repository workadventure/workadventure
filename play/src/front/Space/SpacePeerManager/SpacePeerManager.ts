// -------------------- Default Implementations --------------------x

import { Observable } from "rxjs";
import { Readable, Unsubscriber } from "svelte/store";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceFilterInterface } from "../SpaceFilter/SpaceFilter";
import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
import { MediaStoreStreamable } from "../../Stores/StreamableCollectionStore";
import { DefaultCommunicationState } from "./DefaultCommunicationState";

export interface ICommunicationState {
    getPeer(): SimplePeerConnectionInterface | undefined;
    destroy(): void;
    completeSwitch(): void;
    shouldSynchronizeMediaState(): boolean;
}

// -------------------- Peer Manager --------------------
//Communication manager ?

export class SpacePeerManager {
    private unsubscribes: Unsubscriber[] = [];
    private _communicationState: ICommunicationState;
    public videoContainerMap: Map<string, HTMLVideoElement[]> = new Map<string, HTMLVideoElement[]>();
    public screenShareContainerMap: Map<string, HTMLVideoElement[]> = new Map<string, HTMLVideoElement[]>();

    constructor(
        private space: SpaceInterface,
        private microphoneStateStore: Readable<boolean> = requestedMicrophoneState,
        private cameraStateStore: Readable<boolean> = requestedCameraState,
        private screenSharingStateStore: Readable<boolean> = requestedScreenSharingState
    ) {
        this._communicationState = new DefaultCommunicationState(this.space);
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
}
// -------------------- Interfaces --------------------

export interface SimplePeerConnectionInterface {
    closeAllConnections(needToDelete?: boolean): void;
    blockedFromRemotePlayer(userId: string): void;
    setSpaceFilter(filter: SpaceFilterInterface): void;
    unregister(): void;
    dispatchStream(mediaStream: MediaStream): void;
    videoPeerAdded: Observable<MediaStoreStreamable>;
    videoPeerRemoved: Observable<MediaStoreStreamable>;
    cleanupStore(): void;
    removePeer(userId: string): void;
}

export interface PeerFactoryInterface {
    create(space: SpaceInterface): SimplePeerConnectionInterface;
}
