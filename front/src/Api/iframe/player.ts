import { IframeApiContribution, sendToWorkadventure } from './IframeApiContribution';
import type { HasPlayerMovedEvent, HasPlayerMovedEventCallback } from '../Events/HasPlayerMovedEvent';
import { Subject } from 'rxjs';
import { apiCallback } from './registeredCallbacks';
import { isHasPlayerMovedEvent } from '../Events/HasPlayerMovedEvent';
import type { SpriteEvent } from '../Events/AddSpriteEvent';

const moveStream = new Subject<HasPlayerMovedEvent>();

export class WorkadventurePlayerCommands extends IframeApiContribution<WorkadventurePlayerCommands> {
    callbacks = [
        apiCallback({
            type: 'hasPlayerMoved',
            typeChecker: isHasPlayerMovedEvent,
            callback: (payloadData) => {
                moveStream.next(payloadData);
            },
        }),
    ];

    onPlayerMove(callback: HasPlayerMovedEventCallback): void {
        moveStream.subscribe(callback);
        sendToWorkadventure({
            type: 'onPlayerMove',
            data: null,
        });
    }

    addSprite(options: SpriteEvent) {
        sendToWorkadventure({
            type: 'addSprite',
            data: options,
        });
    }
}

export default new WorkadventurePlayerCommands();
