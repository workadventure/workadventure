import { Subject, Subscription } from "rxjs";
import type { HasPlayerMovedEvent, HasPlayerMovedEventCallback } from "../Events/HasPlayerMovedEvent";
import { IframeApiContribution, queryWorkadventure, sendToWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";
import { playerState } from "./playerState";
import { WorkadventureProximityMeetingCommands } from "./Player/ProximityMeeting";

const moveStream = new Subject<HasPlayerMovedEvent>();

let playerName: string | undefined;

export const setPlayerName = (name: string) => {
    playerName = name;
};

let playerLanguage: string | undefined;

export const setPlayerLanguage = (language: string | undefined) => {
    playerLanguage = language;
};

let tags: string[] | undefined;

export const setTags = (_tags: string[]) => {
    tags = _tags;
};

let userRoomToken: string | undefined;

export const setUserRoomToken = (token: string | undefined) => {
    userRoomToken = token;
};

let playerId: number | undefined;

export const setPlayerId = (_id: number | undefined) => {
    playerId = _id;
};

let uuid: string | undefined;

export const setUuid = (_uuid: string | undefined) => {
    uuid = _uuid;
};

let isLogged: boolean | undefined;

export const setIsLogged = (_isLogged: boolean | undefined) => {
    isLogged = _isLogged === true;
};

export class WorkadventurePlayerCommands extends IframeApiContribution<WorkadventurePlayerCommands> {
    readonly state = playerState;
    private _proximityMeeting: WorkadventureProximityMeetingCommands = new WorkadventureProximityMeetingCommands();

    callbacks = [
        apiCallback({
            type: "hasPlayerMoved",
            callback: (payloadData) => {
                moveStream.next(payloadData);
            },
        }),
    ];

    /**
     * Get the player name.
     * Important: You need to wait for the end of the initialization before accessing.
     * {@link https://docs.workadventu.re/map-building/api-player.md#get-the-player-name | Website documentation}
     *
     * @returns {string} Player name
     */
    get name(): string {
        if (playerName === undefined) {
            throw new Error(
                "Player name not initialized yet. You should call WA.player.name within a WA.onInit callback."
            );
        }
        return playerName;
    }

    /**
     * Get the player UUID.
     * Important: You need to wait for the end of the initialization before accessing.
     * {@link https://docs.workadventu.re/map-building/api-player.md#get-the-player-uuid | Website documentation}
     * @deprecated Use WA.player.uuid instead
     *
     * @returns {string|undefined} Player UUID
     */
    get id(): string | undefined {
        if (uuid === undefined) {
            throw new Error("Player id not initialized yet. You should call WA.player.id within a WA.onInit callback.");
        }
        return uuid;
    }

    /**
     * Get the player id.
     * Important: You need to wait for the end of the initialization before accessing.
     * {@link https://docs.workadventu.re/map-building/api-player.md#get-the-player-id | Website documentation}
     *
     * @returns {number} Player id
     */
    get playerId(): number {
        if (playerId === undefined) {
            throw new Error(
                "Player id not initialized yet. You should call WA.player.playerId within a WA.onInit callback."
            );
        }
        return playerId;
    }

    /**
     * Get the player UUID.
     * Important: You need to wait for the end of the initialization before accessing.
     * {@link https://docs.workadventu.re/map-building/api-player.md#get-the-player-uuid | Website documentation}
     *
     * @returns {string|undefined} Player UUID
     */
    get uuid(): string | undefined {
        if (uuid === undefined) {
            throw new Error(
                "Player id not initialized yet. You should call WA.player.uuid within a WA.onInit callback."
            );
        }
        return uuid;
    }

    /**
     * Get the player language.
     * Important: You need to wait for the end of the initialization before accessing.
     * {@link https://docs.workadventu.re/map-building/api-player.md#get-the-player-language | Website documentation}
     *
     * @returns {string} Player language
     */
    get language(): string {
        if (playerLanguage === undefined) {
            throw new Error(
                "Player language not initialized yet. You should call WA.player.language within a WA.onInit callback."
            );
        }
        return playerLanguage;
    }

    /**
     * Get the player tags.
     * Important: You need to wait for the end of the initialization before accessing.
     * {@link https://docs.workadventu.re/map-building/api-player.md#get-the-tags-of-the-player | Website documentation}
     *
     * @returns {string[]} Player tags
     */
    get tags(): string[] {
        if (tags === undefined) {
            throw new Error("Tags not initialized yet. You should call WA.player.tags within a WA.onInit callback.");
        }
        return tags;
    }

    /**
     * Get the player position.
     * Important: You need to wait for the end of the initialization before accessing.
     * {@link https://docs.workadventu.re/map-building/api-player.md#get-the-position-of-the-player | Website documentation}
     *
     * @returns {Position} Player position
     */
    async getPosition(): Promise<Position> {
        return await queryWorkadventure({
            type: "getPlayerPosition",
            data: undefined,
        });
    }

    /**
     * Listens to the movement of the current user and calls the callback.
     * Sends an event when the user stops moving, changes direction and every 200ms when moving in the same direction.
     * {@link https://docs.workadventu.re/map-building/api-player.md#listen-to-player-movement | Website documentation}
     *
     * @param {HasPlayerMovedEventCallback} callback Function that will be called when the current player is moving. It contains the event
     * @return {Subscription} Subscription to the stream. Use ".unsubscribe()" to stop listening.
     */
    onPlayerMove(callback: HasPlayerMovedEventCallback): Subscription {
        const subscription = moveStream.subscribe(callback);
        sendToWorkadventure({
            type: "onPlayerMove",
            data: undefined,
        });
        // TODO: we should instead return an object with an unsubscribe method that unsubscribes from the stream and sends the message to the iframe (with a counter WA side to avoid stopping the stream for other listeners)
        return subscription;
    }

    /**
     * Player will try to find the shortest path to the destination point and proceed to move there.
     * {@link https://docs.workadventu.re/map-building/api-player.md#move-player-to-position | Website documentation}
     *
     * @param {number} x Horizontal position
     * @param {number} y Vertical position
     * @param {number} speed Speed
     * @returns {Promise<{ x: number, y: number, cancelled: boolean }>} Promise to give an object with the position and if the move has been cancelled or not
     */
    public async moveTo(x: number, y: number, speed?: number): Promise<{ x: number; y: number; cancelled: boolean }> {
        return await queryWorkadventure({
            type: "movePlayerTo",
            data: { x, y, speed },
        });
    }

    public async teleport(x: number, y: number): Promise<void> {
        return await queryWorkadventure({
            type: "teleportPlayerTo",
            data: { x, y },
        });
    }

    /**
     * This token can be used by third party services to authenticate a player and prove that the player is in a given room.
     * The token is generated by the administration panel linked to WorkAdventure.
     * The token is a string and is depending on your implementation of the administration panel.
     * In WorkAdventure SAAS version, the token is a JWT token that contains information such as the player's room ID and its associated membership ID.
     *
     * If you are using the self-hosted version of WorkAdventure and you developed your own administration panel, the token can be anything.
     * By default, self-hosted versions of WorkAdventure don't come with an administration panel, so the token string will be empty.
     * {@link https://docs.workadventu.re/map-building/api-player.md#get-the-user-room-token-of-the-player | Website documentation}
     *
     * @returns {string|undefined} User room token
     */
    get userRoomToken(): string | undefined {
        if (userRoomToken === undefined) {
            throw new Error(
                "User-room token not initialized yet. You should call WA.player.userRoomToken within a WA.onInit callback."
            );
        }
        return userRoomToken;
    }

    /**
     * Display a thin line around your player's name (the "outline").
     * {@link https://docs.workadventu.re/map-building/api-player.md#set-the-outline-color-of-the-player | Website documentation}
     *
     * @param {number} red
     * @param {number} green
     * @param {number} blue
     * @returns {Promise<void>} Promise to wait to known when the outiline has been displayed
     */
    public setOutlineColor(red: number, green: number, blue: number): Promise<void> {
        return queryWorkadventure({
            type: "setPlayerOutline",
            data: {
                red,
                green,
                blue,
            },
        });
    }

    /**
     * Remove the thin line around your player's name (the "outline").
     * {@link https://docs.workadventu.re/map-building/api-player.md#set-the-outline-color-of-the-player | Website documentation}
     *
     * @returns {Promise<void>} Promise to await to known when the outline has been removed
     */
    public removeOutlineColor(): Promise<void> {
        return queryWorkadventure({
            type: "removePlayerOutline",
            data: undefined,
        });
    }

    get proximityMeeting(): WorkadventureProximityMeetingCommands {
        return this._proximityMeeting;
    }

    /**
     * Get a value to provide connected status for the current player.
     * Important: You need to wait for the end of the initialization before accessing.
     * {@link https://docs.workadventu.re/map-building/api-player.md#get-the-tags-of-the-player | Website documentation}
     *
     * @returns {boolean} Player tags
     */
    get isLogged(): boolean {
        if (isLogged === undefined) {
            throw new Error(
                "IsLogged not initialized yet. You should call WA.player.isLogged within a WA.onInit callback."
            );
        }
        return isLogged;
    }

    /**
     * Get a base64 string of the Woka image of the current player.
     * The Woka is in "still" position facing south.
     * @returns {Promise<string>}
     * {@link https://docs.workadventu.re/map-building/api-player.md#get-the-woka-of-the-player | Website documentation}
     *
     * @returns {Promise<string>} Current player woka in base64
     */
    public getWokaPicture(): Promise<string> {
        return queryWorkadventure({
            type: "getWoka",
            data: undefined,
        });
    }
}

export type Position = {
    x: number;
    y: number;
};

export default new WorkadventurePlayerCommands();
