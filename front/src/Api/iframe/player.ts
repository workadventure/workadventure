import { IframeApiContribution, queryWorkadventure, sendToWorkadventure } from "./IframeApiContribution";
import type { HasPlayerMovedEvent, HasPlayerMovedEventCallback } from "../Events/HasPlayerMovedEvent";
import { Subject } from "rxjs";
import { apiCallback } from "./registeredCallbacks";
import { isHasPlayerMovedEvent } from "../Events/HasPlayerMovedEvent";
import { createState } from "./state";

const moveStream = new Subject<HasPlayerMovedEvent>();

let playerName: string | undefined;

export const setPlayerName = (name: string) => {
    playerName = name;
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
    readonly state = createState("player");

    callbacks = [
        apiCallback({
            type: "hasPlayerMoved",
            typeChecker: isHasPlayerMovedEvent,
            callback: (payloadData) => {
                moveStream.next(payloadData);
            },
        }),
    ];

    onPlayerMove(callback: HasPlayerMovedEventCallback): void {
        moveStream.subscribe(callback);
        sendToWorkadventure({
            type: "onPlayerMove",
            data: null,
        });
    }

    get name(): string {
        if (playerName === undefined) {
            throw new Error(
                "Player name not initialized yet. You should call WA.player.name within a WA.onInit callback."
            );
        }
        return playerName;
    }

    get tags(): string[] {
        if (tags === undefined) {
            throw new Error("Tags not initialized yet. You should call WA.player.tags within a WA.onInit callback.");
        }
        return tags;
    }

    get id(): string | undefined {
        // Note: this is not a type, we are checking if playerName is undefined because playerName cannot be undefined
        // while uuid could.
        if (playerName === undefined) {
            throw new Error("Player id not initialized yet. You should call WA.player.id within a WA.onInit callback.");
        }
        return uuid;
    }

    async getPosition(): Promise<Position> {
        return await queryWorkadventure({
            type: "getPlayerPosition",
            data: undefined,
        });
    }

    get userRoomToken(): string | undefined {
        if (userRoomToken === undefined) {
            throw new Error(
                "User-room token not initialized yet. You should call WA.player.userRoomToken within a WA.onInit callback."
            );
        }
        return userRoomToken;
    }

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

    public removeOutlineColor(): Promise<void> {
        return queryWorkadventure({
            type: "removePlayerOutline",
            data: undefined,
        });
    }

    getPlayerProperty(name: string): Promise<PlayerPropertyEvent> {
        return queryWorkadventure({
            type: "getPlayerProperty",
            data: name,
        });
    }

    setPlayerProperty(property: PlayerPropertyEvent) {
        queryWorkadventure({
            type: "setPlayerProperty",
            data: property,
        }).catch((e) => console.error(e));
    }
}

//TODO: move or delete
type Position = {
    x: number;
    y: number;
};

export default new WorkadventurePlayerCommands();
