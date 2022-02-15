import { Subject } from "rxjs";
import type { RemotePlayer } from "../../Phaser/Entity/RemotePlayer";
import {
    ActionsMenuActionClickedEvent,
    isActionsMenuActionClickedEvent,
} from "../Events/ActionsMenuActionClickedEvent";
import {
    isRemotePlayerClickedEvent,
    RemotePlayerClickedEvent as RemotePlayerClickedEvent,
} from "../Events/RemotePlayerClickedEvent";
import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";

export class WorkadventureUtilsCommands extends IframeApiContribution<WorkadventureUtilsCommands> {
    public readonly onRemotePlayerClicked: Subject<RemotePlayerClickedEvent>;
    public readonly onActionsMenuActionClicked: Subject<ActionsMenuActionClickedEvent>;

    constructor() {
        super();
        this.onRemotePlayerClicked = new Subject<RemotePlayerClickedEvent>();
        this.onActionsMenuActionClicked = new Subject<ActionsMenuActionClickedEvent>();
    }

    callbacks = [
        apiCallback({
            type: "remotePlayerClickedEvent",
            typeChecker: isRemotePlayerClickedEvent,
            callback: (payloadData: RemotePlayerClickedEvent) => {
                this.onRemotePlayerClicked.next(payloadData);
            },
        }),
        apiCallback({
            type: "actionsMenuActionClickedEvent",
            typeChecker: isActionsMenuActionClickedEvent,
            callback: (payloadData: ActionsMenuActionClickedEvent) => {
                this.onActionsMenuActionClicked.next(payloadData);
            },
        }),
    ];

    public addMenuActionKeysToRemotePlayer(id: number, actionKeys: string[]): void {
        sendToWorkadventure({
            type: "addMenuActionKeysToRemotePlayer",
            data: { id, actionKeys },
        });
    }
}

export default new WorkadventureUtilsCommands();
