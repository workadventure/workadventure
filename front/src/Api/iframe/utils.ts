import { Subject } from "rxjs";
import type { RemotePlayer } from "../../Phaser/Entity/RemotePlayer";
import {
    isRemotePlayerClickedEvent,
    RemotePlayerClickedEvent as RemotePlayerClickedEvent,
} from "../Events/RemotePlayerClickedEvent";
import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";

export class WorkadventureUtilsCommands extends IframeApiContribution<WorkadventureUtilsCommands> {
    public readonly onRemotePlayerClicked: Subject<RemotePlayerClickedEvent>;

    constructor() {
        super();
        this.onRemotePlayerClicked = new Subject<RemotePlayerClickedEvent>();
    }

    callbacks = [
        apiCallback({
            type: "remotePlayerClickedEvent",
            typeChecker: isRemotePlayerClickedEvent,
            callback: (payloadData: RemotePlayerClickedEvent) => {
                // console.log("remotePlayerClickedEvent callback");
                this.onRemotePlayerClicked.next(payloadData);
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
