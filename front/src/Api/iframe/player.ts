import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";
import type { HasPlayerMovedEvent, HasPlayerMovedEventCallback } from "../Events/HasPlayerMovedEvent";
import { Subject } from "rxjs";
import { apiCallback } from "./registeredCallbacks";
import { getGameState } from "./room";
import { isHasPlayerMovedEvent } from "../Events/HasPlayerMovedEvent";

interface User {
    id: string | undefined;
    nickName: string | null;
    tags: string[];
}

const moveStream = new Subject<HasPlayerMovedEvent>();

export class WorkadventurePlayerCommands extends IframeApiContribution<WorkadventurePlayerCommands> {
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
    getCurrentUser(): Promise<User> {
        return getGameState().then((gameState) => {
            return { id: gameState.uuid, nickName: gameState.nickname, tags: gameState.tags };
        });
    }
}

export default new WorkadventurePlayerCommands();
