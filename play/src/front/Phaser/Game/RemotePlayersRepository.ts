import {
    AvailabilityStatus,
    availabilityStatusToJSON,
    PlayerDetailsUpdatedMessage,
    UserMovedMessage,
} from "@workadventure/messages";
import { Deferred } from "ts-deferred";
import type { MessageUserJoined } from "../../Connection/ConnexionModels";
import type { AddPlayerEvent } from "../../Api/Events/AddPlayerEvent";
import { iframeListener } from "../../Api/IframeListener";
import { RoomConnection } from "../../Connection/RoomConnection";
import { debugAddPlayer, debugRemovePlayer } from "../../Utils/Debuggers";

export interface RemotePlayerData extends MessageUserJoined {
    showVoiceIndicator: boolean;
}

export type PlayerDetailsUpdate = {
    player: RemotePlayerData;
    updated: {
        outlineColor: boolean;
        showVoiceIndicator: boolean;
        availabilityStatus: boolean;
        sayMessage: boolean;
    };
};

/**
 * Tracks the remote players and their state.
 * The repository contains RemotePlayerData objects that containing the raw data (but are not Phaser sprite)
 * We need to make the distinction between RemotePlayerData and RemotePlayer (Phaser sprite) because data is arriving
 * from the Websocket but we cannot safely create/update a sprite until we are in the "update" method of the GameScene.
 */

export class RemotePlayersRepository {
    private removedPlayers = new Set<number>();
    private addedPlayers = new Map<number, RemotePlayerData>();
    private movedPlayers = new Map<number, RemotePlayerData>();
    private updatedPlayers = new Map<number, PlayerDetailsUpdate>();

    private remotePlayersData = new Map<number, RemotePlayerData>();
    private getPlayerDeferred = new Map<number, Deferred<RemotePlayerData>>();

    public addPlayer(userJoinedMessage: MessageUserJoined): void {
        debugAddPlayer("Player will be added to repo", userJoinedMessage.userId);

        const player = {
            ...userJoinedMessage,
            showVoiceIndicator: false,
        };
        this.remotePlayersData.set(userJoinedMessage.userId, player);

        if (this.removedPlayers.has(userJoinedMessage.userId)) {
            // Special case: we add a user that was just removed before. Instead, let's update the user
            this.removedPlayers.delete(userJoinedMessage.userId);
            this.movedPlayers.set(userJoinedMessage.userId, player);
            this.updatedPlayers.set(userJoinedMessage.userId, {
                updated: {
                    availabilityStatus: true,
                    outlineColor: true,
                    showVoiceIndicator: true,
                    sayMessage: true,
                },
                player,
            });
        } else {
            this.movedPlayers.delete(userJoinedMessage.userId);
            this.updatedPlayers.delete(userJoinedMessage.userId);
            this.addedPlayers.set(userJoinedMessage.userId, player);
        }

        // If we were waiting for this player to be added, resolve the promise
        const deferred = this.getPlayerDeferred.get(userJoinedMessage.userId);
        if (deferred) {
            deferred.resolve(player);
            this.getPlayerDeferred.delete(userJoinedMessage.userId);
        }

        debugAddPlayer("Player has been added to repo", userJoinedMessage.userId);
    }

    public removePlayer(userId: number): void {
        debugRemovePlayer("Player will be removed from repo", userId);

        this.remotePlayersData.delete(userId);
        if (this.addedPlayers.has(userId)) {
            this.addedPlayers.delete(userId);
        } else {
            this.removedPlayers.add(userId);
        }
        this.movedPlayers.delete(userId);
        this.updatedPlayers.delete(userId);
        debugRemovePlayer("Player has been removed from repo", userId);
    }

    public movePlayer(userMovedMessage: UserMovedMessage): void {
        const player = this.remotePlayersData.get(userMovedMessage.userId);
        if (player === undefined) {
            console.warn("Could not find user with ID ", userMovedMessage.userId);
            return;
        }
        if (userMovedMessage.position === undefined) {
            console.warn("Could not find user position in move message for user with ID ", userMovedMessage.userId);
            return;
        }
        player.position = userMovedMessage.position;
        this.movedPlayers.set(userMovedMessage.userId, player);
    }

    public updatePlayer(message: PlayerDetailsUpdatedMessage): void {
        const player = this.remotePlayersData.get(message.userId);
        if (player === undefined) {
            console.warn("Could not find user with ID ", message.userId);
            return;
        }
        let updateStruct = this.updatedPlayers.get(message.userId);
        if (updateStruct === undefined) {
            updateStruct = {
                updated: {
                    availabilityStatus: false,
                    outlineColor: false,
                    showVoiceIndicator: false,
                    sayMessage: false,
                },
                player,
            };
            this.updatedPlayers.set(message.userId, updateStruct);
        }

        const details = message.details;
        if (details === undefined) {
            throw new Error("Malformed message. Missing details in PlayerDetailsUpdatedMessage");
        }

        if (details.removeOutlineColor) {
            player.outlineColor = undefined;
            updateStruct.updated.outlineColor = true;
        } else if (details.outlineColor !== undefined) {
            player.outlineColor = details.outlineColor;
            updateStruct.updated.outlineColor = true;
        }
        if (details.showVoiceIndicator !== undefined) {
            player.showVoiceIndicator = details.showVoiceIndicator;
            updateStruct.updated.showVoiceIndicator = true;
        }
        if (details.availabilityStatus !== AvailabilityStatus.UNCHANGED) {
            player.availabilityStatus = details.availabilityStatus;
            updateStruct.updated.availabilityStatus = true;
        }
        if (details.setVariable !== undefined) {
            const value = RoomConnection.unserializeVariable(details.setVariable.value);
            player.variables.set(details.setVariable.name, value);

            // TODO: is it the responsibility of RemotePlayersRepository to send messages to the iframe?
            // TODO: is it the responsibility of RemotePlayersRepository to send messages to the iframe?
            // TODO: is it the responsibility of RemotePlayersRepository to send messages to the iframe?
            // If yes, we might as well move ALL iframe listeners related to remote players here!
            iframeListener.setSharedPlayerVariable({
                key: details.setVariable.name,
                value: value,
                playerId: player.userId,
            });
        }
        if (details.sayMessage) {
            player.sayMessage = details.sayMessage;
            updateStruct.updated.sayMessage = true;
        }
    }

    public getRemovedPlayers(): Set<number> {
        return this.removedPlayers;
    }

    public getAddedPlayers(): IterableIterator<MessageUserJoined> {
        return this.addedPlayers.values();
    }

    public getMovedPlayers(): IterableIterator<MessageUserJoined> {
        return this.movedPlayers.values();
    }

    public getUpdatedPlayers(): IterableIterator<PlayerDetailsUpdate> {
        return this.updatedPlayers.values();
    }

    public reset(): void {
        this.removedPlayers.clear();
        this.addedPlayers.clear();
        this.movedPlayers.clear();
        this.updatedPlayers.clear();
    }

    public getPlayers(): ReadonlyMap<number, MessageUserJoined> {
        return this.remotePlayersData;
    }

    /**
     * Generates an event dispatched by iframe to inform users of the new remote player.
     */
    public static toIframeAddPlayerEvent(player: MessageUserJoined): AddPlayerEvent {
        return {
            playerId: player.userId,
            userUuid: player.userUuid,
            name: player.name,
            position: {
                x: player.position.x,
                y: player.position.y,
            },
            outlineColor: player.outlineColor,
            availabilityStatus: availabilityStatusToJSON(player.availabilityStatus),
            variables: player.variables,
        };
    }

    /**
     * This method is used to get the player data for a given user ID.
     * It returns a promise because in some specific cases, the player data is not immediately available (for instance,
     * we could get a WebRTC request with the user ID before the user is added to the remotePlayersRepository).
     */
    public getPlayer(userId: number): Promise<RemotePlayerData> {
        const player = this.remotePlayersData.get(userId);
        if (player) {
            return Promise.resolve(player);
        }
        const deferred = new Deferred<RemotePlayerData>();
        this.getPlayerDeferred.set(userId, deferred);
        //return deferred.promise;

        // We wait for 5 seconds for the player to be added
        return Promise.race([
            deferred.promise,
            new Promise<RemotePlayerData>((resolve, reject) => {
                setTimeout(() => {
                    reject(new Error("Timeout waiting for player data"));
                }, 5000);
            }),
        ]);
    }
}
