// -------------------- Default Implementations --------------------x

import { MapStore } from "@workadventure/store-utils";
import { Observable } from "rxjs";
import { Unsubscriber } from "svelte/store";
import { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
import { VideoPeer } from "../../WebRtc/VideoPeer";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceFilterInterface } from "../SpaceFilter/SpaceFilter";
import { CommunicationType, LivekitConnection } from "../../Livekit/LivekitConnection";
import { gameManager } from "../../Phaser/Game/GameManager";
import { SimplePeer } from "../../WebRtc/SimplePeer";
import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
import { WebRTCState } from "./WebRTCState";
import { LivekitState } from "./LivekitState";

export interface ICommunicationState {
    getPeer(): SimplePeerConnectionInterface | undefined;
    destroy(): void;
}
// -------------------- Peer Manager --------------------
//Communication manager
//TODO : voir si on part sur des states comme dans le back / pas d'utilité de l'avoir les 2 instances en meme temps
export class SpacePeerManager {
    // private _peer: SimplePeerConnectionInterface;
    // private livekitConnection: LivekitConnection;
    private unsubscribes: Unsubscriber[] = [];
    private _communicationState: ICommunicationState;
    constructor(private space: SpaceInterface) {
            // this._peer = this.peerFactory.create(this.space);
            // this.livekitConnection = new LivekitConnection(this.space);

            //Autre maniere de savoir si on est en livekit ou webRTC c'est le back qui va décider
            console.log("SpacePeerManager constructor");

            this._communicationState = new WebRTCState(this.space, this);
            
            this.synchronizeMediaState();
    }

    private synchronizeMediaState(): void {
        //TODO : trouver un moyen d'enlever les dépendances de MediaStore
        this.unsubscribes.push(
            requestedMicrophoneState.subscribe((state) => {
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
        this._communicationState?.destroy();
        for (const unsubscribe of this.unsubscribes) {
            unsubscribe();
        }
    }

    getPeer(): SimplePeerConnectionInterface | undefined {
        return this._communicationState.getPeer();
    }

    setState(state: ICommunicationState): void {
        this._communicationState = state;
    }
}
// -------------------- Interfaces --------------------

export interface SimplePeerConnectionInterface {
    closeAllConnections(): void;
    blockedFromRemotePlayer(userId: number): void;
    setSpaceFilter(filter: SpaceFilterInterface): void;
    unregister(): void;
    dispatchStream(mediaStream: MediaStream): void;
    videoPeerAdded: Observable<VideoPeer>;
    videoPeerRemoved: Observable<VideoPeer>;
    peerStore: MapStore<number, VideoPeer>;
    screenSharingPeerStore: MapStore<number, ScreenSharingPeer>;
    cleanupStore(): void;
    removePeer(userId: number): void;
}

export interface PeerFactoryInterface {
    create(space: SpaceInterface): SimplePeerConnectionInterface;
}
