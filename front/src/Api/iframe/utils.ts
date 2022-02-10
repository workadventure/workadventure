import { Subject } from "rxjs";
import {
    isActionMenuClickedEvent,
    ActionMenuclickedEvent,
    ActionMenuclickedEventCallback,
} from "../Events/ActionMenuClickedEvent";
import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";

// const openActionMenuStream = new Subject<ActionMenuclickedEvent>();

export class WorkadventureUtilsCommands extends IframeApiContribution<WorkadventureUtilsCommands> {
    public readonly onActionMenuClicked: Subject<ActionMenuclickedEvent>;

    constructor() {
        super();
        this.onActionMenuClicked = new Subject<ActionMenuclickedEvent>();
    }

    callbacks = [
        apiCallback({
            type: "actionMenuClickedEvent",
            typeChecker: isActionMenuClickedEvent,
            callback: (payloadData: ActionMenuclickedEvent) => {
                console.log("actionMenuClickedEvent callback");
                this.onActionMenuClicked.next(payloadData);
            },
        }),
    ];

    // onActionMenuClicked(): Subject<ActionMenuclickedEvent> {
    //     return openActionMenuStream;
    // openActionMenuStream.subscribe(callback);
    // sendToWorkadventure({
    //     type: "onOpenActionMenu",
    //     data: null,
    // });
    // }
}

export default new WorkadventureUtilsCommands();
