import type { SetPlayerVariableMessage } from "@workadventure/messages";
import type { RoomConnection } from "../../Connection/RoomConnection";
import { iframeListener } from "../../Api/IframeListener";
import type { SetPlayerVariableEvent } from "../../Api/Events/SetPlayerVariableEvent";
import { localUserStore } from "../../Connection/LocalUserStore";
import type { IframeEventDispatcher } from "./IframeEventDispatcher";

/**
 * Stores variables and provides a bridge between scripts and the pusher server.
 */
export class PlayerVariablesManager {
    constructor(
        private roomConnection: RoomConnection,
        private eventDispatcher: IframeEventDispatcher,
        private _variables: Map<string, unknown>,
        private roomId: string,
        private worldId: string | undefined
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

        // If we are not logged
        if (localUserStore.isLogged() === false && event.persist) {
            let context: string;
            if (event.scope === "room") {
                context = this.roomId;
            } else if (this.worldId) {
                context = this.worldId;
            } else {
                context = this.roomId;
            }
            let expire: number | undefined;
            if (event.ttl) {
                expire = new Date().getTime() + event.ttl * 1000;
            }
            localUserStore.setUserProperty(event.key, event.value, context, event.public, expire);
        }

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
