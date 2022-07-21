import type { RoomConnection } from "../../Connexion/RoomConnection";
import { iframeListener } from "../../Api/IframeListener";
import { SetPlayerVariableEvent } from "../../Api/Events/SetPlayerVariableEvent";
import { IframeEventDispatcher } from "./IframeEventDispatcher";
import { SetPlayerVariableMessage } from "../../Messages/ts-proto-generated/protos/messages";

/**
 * Stores variables and provides a bridge between scripts and the pusher server.
 */
export class PlayerVariablesManager {
    constructor(
        private roomConnection: RoomConnection,
        private eventDispatcher: IframeEventDispatcher,
        private _variables: Map<string, unknown>
    ) {
        iframeListener.registerAnswerer("setPlayerVariable", (event, source) => {
            this.setVariable(event, source);

            // TODO: should we save user data in local storage or not at all?
            //localUserStore.setUserProperty(event.key, event.value);
        });

        // TODO: We should be allowed to receive details for users with the same UUID as me on the same map or same world.
        // So we probably need a special message here (or we should listen to the Update message on our own uuid?)
    }

    private setVariable(event: SetPlayerVariableEvent, source: MessageEventSource | null, emitOnNetwork = true): void {
        const key = event.key;

        // Let's stop any propagation of the value we set is the same as the existing value.
        if (JSON.stringify(event.value) === JSON.stringify(this._variables.get(key))) {
            return;
        }

        this._variables.set(key, event.value);

        // Dispatch to the room connection.
        if (emitOnNetwork) {
            this.roomConnection.emitPlayerSetVariable(event);
        }

        // Dispatch to other iframes
        iframeListener.dispatchPlayerVariableToOtherIframes(key, event.value, source);
    }

    /**
     * Updates a variable locally. This is called when receiving a message from the network.
     * It can only happen if 2 players with the same UUID are in the same room.
     */
    public updateVariable(setVariable: SetPlayerVariableMessage): void {
        const key = setVariable.name;

        // Let's stop any propagation of the value we set is the same as the existing value.
        if (JSON.stringify(setVariable.value) === JSON.stringify(this._variables.get(key))) {
            return;
        }

        this._variables.set(key, setVariable.value);

        // Dispatch to other iframes
        iframeListener.dispatchPlayerVariableToOtherIframes(key, setVariable.value, null);
    }

    public close(): void {
        iframeListener.unregisterAnswerer("setPlayerVariable");
    }

    get variables(): Map<string, unknown> {
        return this._variables;
    }
}
