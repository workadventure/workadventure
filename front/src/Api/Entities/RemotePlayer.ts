import { sendToWorkadventure } from "../Iframe/IframeApiContribution";
import { ActionsMenuAction } from "../Iframe/ui";
import { RemotePlayerInitializer } from "../Types/Initializers/RemotePlayerInitializer";

export class RemotePlayer {
    public readonly id: number;
    public readonly uuid: string;
    public readonly name: string;

    private actions: Map<string, ActionsMenuAction> = new Map<string, ActionsMenuAction>();

    constructor(remotePlayer: RemotePlayerInitializer) {
        this.id = remotePlayer.id;
        this.uuid = remotePlayer.uuid;
        this.name = remotePlayer.name;
    }

    public addAction(key: string, callback: Function): ActionsMenuAction {
        const newAction = new ActionsMenuAction(this, key, callback);
        this.actions.set(key, newAction);
        sendToWorkadventure({
            type: "addActionsMenuKeyToRemotePlayer",
            data: { id: this.id, actionKey: key },
        });
        return newAction;
    }

    public callAction(key: string): void {
        const action = this.actions.get(key);
        if (action) {
            action.call();
        }
    }

    public removeAction(key: string): void {
        this.actions.delete(key);
        sendToWorkadventure({
            type: "removeActionsMenuKeyFromRemotePlayer",
            data: { id: this.id, actionKey: key },
        });
    }
}
