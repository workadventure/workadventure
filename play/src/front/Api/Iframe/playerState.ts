import { queryWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";
import { AbstractWorkadventureStateCommands } from "./AbstractState";
import { PrivatePlayerState } from "./PrivatePlayerState";
import { PublicPlayerState } from "./PublicPlayerState";

type PlayerState = PublicPlayerState & PrivatePlayerState;

export class WorkadventurePlayerStateCommands extends AbstractWorkadventureStateCommands<PlayerState> {
    public constructor() {
        super();
    }

    callbacks = [
        apiCallback({
            type: "setPlayerVariable",
            callback: (payloadData) => {
                this.setVariableResolvers.next(payloadData);
            },
        }),
    ];

    saveVariable<K extends keyof PlayerState & string>(
        key: K,
        value: PlayerState[K],
        options?: {
            public?: boolean;
            persist?: boolean;
            ttl?: number;
            scope?: "world" | "room";
        }
    ): Promise<void> {
        if (options && options.ttl !== undefined && !options.persist) {
            throw new Error("A variable that has a ttl set must be persisted with 'persist = true'");
        }
        if (options && options.scope === "world" && !options.persist) {
            throw new Error("A variable that has a 'world' scope must be persisted with 'persist = true'");
        }

        this.variables[key] = value;

        // Let's trigger the variable change locally:
        const subscriber = this.variableSubscribers[key];
        if (subscriber) {
            subscriber.next(value);
        }

        return queryWorkadventure({
            type: "setPlayerVariable",
            data: {
                key,
                value,
                public: options?.public ?? false,
                ttl: options?.ttl ?? undefined,
                persist: options?.persist ?? true,
                scope: options?.scope ?? "world",
            },
        });
    }
}

export const playerState = new Proxy(new WorkadventurePlayerStateCommands(), {
    get(target: WorkadventurePlayerStateCommands, p: PropertyKey, receiver: unknown): unknown {
        if (p in target) {
            return Reflect.get(target, p, receiver);
        }
        return target.loadVariable(p.toString());
    },
    set(target: WorkadventurePlayerStateCommands, p: PropertyKey, value: unknown, receiver: unknown): boolean {
        // Note: when using "set", there is no way to wait, so we ignore the return of the promise.
        // User must use WA.state.saveVariable to have error message.
        target.saveVariable(p.toString(), value).catch((e) => console.error(e));
        return true;
    },
    has(target: WorkadventurePlayerStateCommands, p: PropertyKey): boolean {
        if (p in target) {
            return true;
        }
        return target.hasVariable(p.toString());
    },
}) as WorkadventurePlayerStateCommands & PlayerState;
