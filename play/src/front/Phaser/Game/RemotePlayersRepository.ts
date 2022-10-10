/**
 * Tracks the remote players and their state.
 * The repository contains RemotePlayerData objects that containing the raw data (but are not Phaser sprite)
 * We need to make the distinction between RemotePlayerData and RemotePlayer (Phaser sprite) because data is arriving
 * from the Websocket but we cannot safely create/update a sprite until we are in the "update" method of the GameScene.
 */
import {
    availabilityStatusToJSON,
    PlayerDetailsUpdatedMessage,
    UserMovedMessage,
} from "../../../messages/ts-proto-generated/protos/messages";
import type { MessageUserJoined } from "../../Connexion/ConnexionModels";
import type { AddPlayerEvent } from "../../Api/Events/AddPlayerEvent";
import { iframeListener } from "../../Api/IframeListener";
import { RoomConnection } from "../../Connexion/RoomConnection";

interface RemotePlayerData extends MessageUserJoined {
    showVoiceIndicator: boolean;
}

export type PlayerDetailsUpdate = {
    player: RemotePlayerData;
    updated: {
        outlineColor: boolean;
        showVoiceIndicator: boolean;
        availabilityStatus: boolean;
    };
};

export class RemotePlayersRepository {
    private removedPlayers = new Set<number>();
    private addedPlayers = new Map<number, RemotePlayerData>();
    private movedPlayers = new Map<number, RemotePlayerData>();
    private updatedPlayers = new Map<number, PlayerDetailsUpdate>();

    private remotePlayersData = new Map<number, RemotePlayerData>();

    public addPlayer(userJoinedMessage: MessageUserJoined): void {
        const player = {
            ...userJoinedMessage,
            showVoiceIndicator: false,
        };
        this.remotePlayersData.set(userJoinedMessage.userId, player);
        this.addedPlayers.set(userJoinedMessage.userId, player);
        this.movedPlayers.delete(userJoinedMessage.userId);
        this.removedPlayers.delete(userJoinedMessage.userId);
        this.updatedPlayers.delete(userJoinedMessage.userId);
    }

    public removePlayer(userId: number): void {
        this.remotePlayersData.delete(userId);
        this.addedPlayers.delete(userId);
        this.movedPlayers.delete(userId);
        this.updatedPlayers.delete(userId);
        this.removedPlayers.add(userId);
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
        if (details.availabilityStatus !== undefined) {
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

    public getPlayers(): IterableIterator<MessageUserJoined> {
        return this.remotePlayersData.values();
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
}
