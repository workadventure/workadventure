import { IframeApiContribution, queryWorkadventure, sendToWorkadventure } from "./IframeApiContribution";
import type { HasPlayerMovedEvent, HasPlayerMovedEventCallback } from "../Events/HasPlayerMovedEvent";
import {Observable, Subject} from "rxjs";
import { apiCallback } from "./registeredCallbacks";
import { createState } from "./state";
import {SetSharedPlayerVariableEvent} from "../Events/SetSharedPlayerVariableEvent";
import {RemotePlayer, remotePlayers} from "./Players/RemotePlayer";

const sharedPlayersVariableStream = new Map<string, Subject<SetSharedPlayerVariableEvent>>();
const _newRemotePlayersStream = new Subject<RemotePlayer>();
const newRemotePlayersStream = _newRemotePlayersStream.asObservable();
const _removeRemotePlayersStream = new Subject<RemotePlayer>();
const removeRemotePlayersStream = _removeRemotePlayersStream.asObservable();

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
                const remotePlayer = new RemotePlayer(payloadData);
                remotePlayers.set(payloadData.userId, remotePlayer);
                _newRemotePlayersStream.next(remotePlayer);
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
                }
            },
        }),
    ];

    public enableTracking(options?: {
        trackPlayers?: boolean,
        trackMovement?: boolean,
                          }): void {
        this.trackingPlayers = options?.trackPlayers ?? true;
        this.trackingMovement = options?.trackMovement ?? true;
        sendToWorkadventure({
            type: "enablePlayersTracking",
            data: {
                trackPlayers: this.trackingPlayers,
                trackMovement: this.trackingMovement,
            }
        });
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
    public onPlayerEnters(): Observable<RemotePlayer> {
        if (!this.trackingPlayers) {
            throw new Error("Cannot call WA.players.onPlayerEnters(). You forgot to call WA.players.enableTracking() first.");
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
    public onPlayerLeaves(): Observable<RemotePlayer> {
        if (!this.trackingPlayers) {
            throw new Error("Cannot call WA.players.onPlayerLeaves(). You forgot to call WA.players.enableTracking() first.");
        }
        return removeRemotePlayersStream;
    }

    /**
     * Returns a RemotePlayer by its id.
     *
     * Note: if the same user is connected twice, it will be considered as 2 different players with 2 different IDs.
     */
    public get(id: number): RemotePlayer|undefined {
        return remotePlayers.get(id);
    }

    /**
     * Returns the list of all nearby remote players.
     * The list only contains the players in the same zone as the current player (where zone ~= viewport)
     */
    public list(): IterableIterator<RemotePlayer> {
        return remotePlayers.values();
    }
}

export default new WorkadventurePlayersCommands();
