// -------------------- Default Implementations --------------------x

import { MapStore } from "@workadventure/store-utils";
import { Observable } from "rxjs";
import { Readable, Unsubscriber } from "svelte/store";
import { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
import { VideoPeer } from "../../WebRtc/VideoPeer";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceFilterInterface } from "../SpaceFilter/SpaceFilter";
import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
import { WebRTCState } from "./WebRTCState";

export interface ICommunicationState {
    getPeer(): SimplePeerConnectionInterface | undefined;
    destroy(): void;
    completeSwitch(): void;
}

// -------------------- Peer Manager --------------------
//Communication manager ?

export class SpacePeerManager {
    private unsubscribes: Unsubscriber[] = [];
    private _communicationState: ICommunicationState;
    constructor(
        private space: SpaceInterface,
        private microphoneStateStore: Readable<boolean> = requestedMicrophoneState,
    ) {
        this._communicationState = new WebRTCState(this.space, this);
        this.synchronizeMediaState();
    }

    private synchronizeMediaState(): void {
        //TODO : trouver un moyen d'enlever les dépendances de MediaStore
        this.unsubscribes.push(
            this.microphoneStateStore.subscribe((state) => {
                this.space.emitUpdateUser({
                    microphoneState: state,
                });
            })
        );
        this.unsubscribes.push(
            requestedCameraState.subscribe((state) => {
                this.space.emitUpdateUser({
                    cameraState: state,
                });
            })
        );

        this.unsubscribes.push(
            requestedScreenSharingState.subscribe((state) => {
                this.space.emitUpdateUser({
                    screenSharingState: state,
                });
            })
        );
    }

    destroy(): void {
        if(this._communicationState) {
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
        if(this._communicationState) {
            this._communicationState.destroy();
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
    videoPeerAdded: Observable<VideoPeer>;
    videoPeerRemoved: Observable<VideoPeer>;
    cleanupStore(): void;
    removePeer(userId: string): void;
}

export interface PeerFactoryInterface {
    create(space: SpaceInterface): SimplePeerConnectionInterface;
}
