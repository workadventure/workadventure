import { IframeApiContribution, queryWorkadventure, sendToWorkadventure } from "./IframeApiContribution";
import type { HasPlayerMovedEvent, HasPlayerMovedEventCallback } from "../Events/HasPlayerMovedEvent";
import { Subject } from "rxjs";
import { apiCallback } from "./registeredCallbacks";
import { playerState } from "./playerState";

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

let uuid: string | undefined;

let userRoomToken: string | undefined;

export const setUserRoomToken = (token: string | undefined) => {
    userRoomToken = token;
};

export const setUuid = (_uuid: string | undefined) => {
    uuid = _uuid;
};

export class WorkadventurePlayerCommands extends IframeApiContribution<WorkadventurePlayerCommands> {
    readonly state = playerState;

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
     * {@link https://workadventu.re/map-building/api-player.md#get-the-player-name | Website documentation}
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
     * Get the player id.
     * Important: You need to wait for the end of the initialization before accessing.
     * {@link https://workadventu.re/map-building/api-player.md#get-the-player-id | Website documentation}
     *
     * @returns {string|undefined} Player id
     */
    get id(): string | undefined {
        // Note: this is not a type, we are checking if playerName is undefined because playerName cannot be undefined
        // while uuid could.
        if (playerName === undefined) {
            throw new Error("Player id not initialized yet. You should call WA.player.id within a WA.onInit callback.");
        }
        return uuid;
    }

    /**
     * Get the player language.
     * Important: You need to wait for the end of the initialization before accessing.
     * {@link https://workadventu.re/map-building/api-player.md#get-the-player-language | Website documentation}
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
     * {@link https://workadventu.re/map-building/api-player.md#get-the-tags-of-the-player | Website documentation}
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
     * {@link https://workadventu.re/map-building/api-player.md#get-the-position-of-the-player | Website documentation}
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
     * {@link https://workadventu.re/map-building/api-player.md#listen-to-player-movement | Website documentation}
     *
     * @param {HasPlayerMovedEventCallback} callback Function that will be called when the current player is moving. It contains the event
     */
    onPlayerMove(callback: HasPlayerMovedEventCallback): void {
        moveStream.subscribe(callback);
        sendToWorkadventure({
            type: "onPlayerMove",
            data: undefined,
        });
    }

    /**
     * Player will try to find shortest path to the destination point and proceed to move there.
     * {@link https://workadventu.re/map-building/api-player.md#move-player-to-position | Website documentation}
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

    /**
     * This token can be used by third party services to authenticate a player and prove that the player is in a given room.
     * The token is generated by the administration panel linked to WorkAdventure.
     * The token is a string and is depending on your implementation of the administration panel.
     * In WorkAdventure SAAS version, the token is a JWT token that contains information such as the player's room ID and its associated membership ID.
     *
     * If you are using the self-hosted version of WorkAdventure and you developed your own administration panel, the token can be anything.
     * By default, self-hosted versions of WorkAdventure don't come with an administration panel, so the token string will be empty.
     * {@link https://workadventu.re/map-building/api-player.md#get-the-user-room-token-of-the-player | Website documentation}
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
     * {@link https://workadventu.re/map-building/api-player.md#set-the-outline-color-of-the-player | Website documentation}
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
     * {@link https://workadventu.re/map-building/api-player.md#set-the-outline-color-of-the-player | Website documentation}
     *
     * @returns {Promise<void>} Promise to await to known when the outline has been removed
     */
    public removeOutlineColor(): Promise<void> {
        return queryWorkadventure({
            type: "removePlayerOutline",
            data: undefined,
        });
    }
}

export type Position = {
    x: number;
    y: number;
};

export default new WorkadventurePlayerCommands();
