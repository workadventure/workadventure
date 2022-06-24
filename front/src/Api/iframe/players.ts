import { IframeApiContribution, queryWorkadventure } from "./IframeApiContribution";
import { Observable, Subject } from "rxjs";
import { apiCallback } from "./registeredCallbacks";
import { SetSharedPlayerVariableEvent } from "../Events/SetSharedPlayerVariableEvent";
import {RemotePlayer, RemotePlayerInterface, RemotePlayerMoved, remotePlayers} from "./Players/RemotePlayer";
import {AddPlayerEvent, RemotePlayerChangedEvent} from "../Events/AddPlayerEvent";

const sharedPlayersVariableStream = new Map<string, Subject<SetSharedPlayerVariableEvent>>();
const _newRemotePlayersStream = new Subject<RemotePlayer>();
const newRemotePlayersStream = _newRemotePlayersStream.asObservable();
const _removeRemotePlayersStream = new Subject<RemotePlayer>();
const removeRemotePlayersStream = _removeRemotePlayersStream.asObservable();
const _playersMovedStream = new Subject<RemotePlayerMoved>();
const playersMovedStream = _playersMovedStream.asObservable();

export class WorkadventurePlayersCommands extends IframeApiContribution<WorkadventurePlayersCommands> {
    private trackingPlayers = false;
    private trackingMovement = false;

    callbacks = [
        apiCallback({
            type: "setSharedPlayerVariable",
            callback: (payloadData) => {
                let stream = sharedPlayersVariableStream.get(payloadData.key);
                if (!stream) {
                    stream = new Subject<SetSharedPlayerVariableEvent>();
                    sharedPlayersVariableStream.set(payloadData.key, stream);
                }
                stream.next(payloadData);
            },
        }),
        apiCallback({
            type: "addRemotePlayer",
            callback: (payloadData) => {
                this.registerRemotePlayer(payloadData);
            },
        }),
        apiCallback({
            type: "removeRemotePlayer",
            callback: (userId) => {
                const remotePlayer = remotePlayers.get(userId);
                if (remotePlayer === undefined) {
                    console.warn("Could not find remote player to delete: ", userId);
                } else {
                    remotePlayers.delete(userId);
                    _removeRemotePlayersStream.next(remotePlayer);
                    remotePlayer.destroy();
                }
            },
        }),
        apiCallback({
            type: "remotePlayerChanged",
            callback: (event) => {
                const remotePlayer = remotePlayers.get(event.userId);
                if (remotePlayer === undefined) {
                    console.warn("Could not find remote player with ID : ", event.userId);
                    return;
                }

                if (event.position) {
                    const oldPosition = remotePlayer.position;
                    remotePlayer.position = event.position;

                    _playersMovedStream.next({
                        player: remotePlayer,
                        newPosition: event.position,
                        oldPosition
                    });
                }
                // TODO: listen to other status changes (like outlineColor, availability, etc...)
            },
        }),
    ];

    private registerRemotePlayer(event: AddPlayerEvent): void {
        const remotePlayer = new RemotePlayer(event);
        remotePlayers.set(event.userId, remotePlayer);
        _newRemotePlayersStream.next(remotePlayer);
    }

    public async enableTracking(options?: { trackPlayers?: boolean; trackMovement?: boolean }): Promise<void> {
        this.trackingPlayers = options?.trackPlayers ?? true;
        this.trackingMovement = options?.trackMovement ?? true;
        const remotePlayersData = await queryWorkadventure({
            type: "enablePlayersTracking",
            data: {
                trackPlayers: this.trackingPlayers,
                trackMovement: this.trackingMovement,
            },
        });

        for (const remotePlayerEvent of remotePlayersData) {
            console.log('PLAYER WAS ALREADY ON THE ROOM WHEN WE STARTED TRACKING ', remotePlayerEvent);
            this.registerRemotePlayer(remotePlayerEvent);
        }
    }

    public onVariableChange(variableName: string, callback: (userId: number, value: unknown) => void) {
        let stream = sharedPlayersVariableStream.get(variableName);
        if (!stream) {
            stream = new Subject<SetSharedPlayerVariableEvent>();
            sharedPlayersVariableStream.set(variableName, stream);
        }
        stream.subscribe((payload) => {
            callback(payload.playerId, payload.value);
        });
    }

    /**
     * Listens to new remote players.
     * These will be triggered when a remote player is entering our "zone" (zone ~= viewport)
     * This means this will NOT be triggered when a remote player enters the map, but when the remote player is
     * getting visible.
     *
     * Usage:
     *
     * ```
     * WA.players.onPlayerEnters.subscribe((remotePlayer) => { doStuff(); });
     * ```
     */
    public onPlayerEnters(): Observable<RemotePlayerInterface> {
        if (!this.trackingPlayers) {
            throw new Error(
                "Cannot call WA.players.onPlayerEnters(). You forgot to call WA.players.enableTracking() first."
            );
        }
        return newRemotePlayersStream;
    }

    /**
     * Listens to remote players leaving.
     * These will be triggered when a remote player is leaving our "zone" (zone ~= viewport)
     * This means this will be triggered when a remote player leaves the map, but ALSO when the remote player is
     * walking away and is no longer visible.
     *
     * Usage:
     *
     * ```
     * WA.players.onPlayerLeaves.subscribe((remotePlayer) => { doCleanupStuff(); });
     * ```
     */
    public onPlayerLeaves(): Observable<RemotePlayerInterface> {
        if (!this.trackingPlayers) {
            throw new Error(
                "Cannot call WA.players.onPlayerLeaves(). You forgot to call WA.players.enableTracking() first."
            );
        }
        return removeRemotePlayersStream;
    }

    /**
     * Listens to movement from all players who are in our zone (zone ~= viewport)
     * This means this may NOT be triggered when a remote player moves but is far away from us.
     *
     * Usage:
     *
     * ```
     * WA.players.onPlayersMove.subscribe(({ player, newPosition, oldPosition }) => { doStuff(); });
     * ```
     */
    public onPlayersMove(): Observable<RemotePlayerMoved> {
        if (!this.trackingMovement) {
            throw new Error(
                "Cannot call WA.players.onPlayersMove(). You forgot to call WA.players.enableTracking() first."
            );
        }
        return playersMovedStream;
    }

    /**
     * Returns a RemotePlayer by its id.
     *
     * Note: if the same user is connected twice, it will be considered as 2 different players with 2 different IDs.
     */
    public get(id: number): RemotePlayerInterface | undefined {
        return remotePlayers.get(id);
    }

    /**
     * Returns the list of all nearby remote players.
     * The list only contains the players in the same zone as the current player (where zone ~= viewport)
     */
    public list(): IterableIterator<RemotePlayerInterface> {
        return remotePlayers.values();
    }
}

export default new WorkadventurePlayersCommands();
