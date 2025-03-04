// -------------------- Default Implementations --------------------x

import { MapStore } from "@workadventure/store-utils";
import { Observable } from "rxjs";
import { Unsubscriber } from "svelte/store";
import { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
import { VideoPeer } from "../../WebRtc/VideoPeer";
import { SpaceInterface } from "../SpaceInterface";
import { SpaceFilterInterface } from "../SpaceFilter/SpaceFilter";
import { LivekitConnection } from "../../Livekit/LivekitConnection";
import { gameManager } from "../../Phaser/Game/GameManager";
import { SimplePeer } from "../../WebRtc/SimplePeer";
import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";

export const defaultPeerFactory: PeerFactoryInterface = {
    create: (space: SpaceInterface) => {
        const repository = gameManager.getCurrentGameScene().getRemotePlayersRepository();
        return new SimplePeer(space, repository);
    },
};

// -------------------- Peer Manager --------------------
// ou media manager
export class SpacePeerManager {
    private _peer: SimplePeerConnectionInterface | undefined;
    private livekitConnection: LivekitConnection | undefined;
    private unsubscribes: Unsubscriber[] = [];

    constructor(private space: SpaceInterface, private peerFactory: PeerFactoryInterface) {}

    initialize(propertiesToSync: string[]): void {
        //TODO : voir si on s'occupe des conditions dans le front alors que le back gère les conditions
        if (
            propertiesToSync.includes("screenSharingState") ||
            propertiesToSync.includes("cameraState") ||
            propertiesToSync.includes("microphoneState")
        ) {
            //TODO : voir si on instancie les 2 ou on fait un switch comme dans le back
            this._peer = this.peerFactory.create(this.space);
            this.livekitConnection = new LivekitConnection(this.space);
            this.synchronizeMediaState();
        }
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
        this._peer?.closeAllConnections();
        this._peer?.unregister();
        this.livekitConnection?.destroy();
        for (const unsubscribe of this.unsubscribes) {
            unsubscribe();
        }
    }

    //TODO : voir si on en a toujours besoin avoir avoir mis les map dans les space directement
    getPeer(): SimplePeerConnectionInterface | undefined {
        return this._peer;
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

export interface PeerConnectionInterface {
    destroy(): void;
}
export interface PeerStoreInterface {
    getSpaceStore(spaceName: string): Map<number, PeerConnectionInterface> | undefined;
    cleanupStore(spaceName: string): void;
    removePeer(userId: number, spaceName: string): void;
    getPeer(userId: number, spaceName: string): PeerConnectionInterface | undefined;
}
