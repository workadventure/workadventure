import { Observable, Subject } from "rxjs";

import { EnterLeaveEvent, isEnterLeaveEvent } from "../Events/EnterLeaveEvent";

import { IframeApiContribution, queryWorkadventure, sendToWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";
import { isSetVariableEvent, SetVariableEvent } from "../Events/SetVariableEvent";

import type { ITiledMap } from "../../Phaser/Map/ITiledMap";

export class WorkadventureStateCommands extends IframeApiContribution<WorkadventureStateCommands> {
    private setVariableResolvers = new Subject<SetVariableEvent>();
    private variables = new Map<string, unknown>();
    private variableSubscribers = new Map<string, Subject<unknown>>();

    constructor(private target: "global" | "player") {
        super();

        this.setVariableResolvers.subscribe((event) => {
            const oldValue = this.variables.get(event.key);
            // If we are setting the same value, no need to do anything.
            // No need to do this check since it is already performed in SharedVariablesManager
            /*if (JSON.stringify(oldValue) === JSON.stringify(event.value)) {
                return;
            }*/

            this.variables.set(event.key, event.value);
            const subject = this.variableSubscribers.get(event.key);
            if (subject !== undefined) {
                subject.next(event.value);
            }
        });
    }

    callbacks = [
        apiCallback({
            type: "setVariable",
            typeChecker: isSetVariableEvent,
            callback: (payloadData) => {
                if (payloadData.target === this.target) {
                    this.setVariableResolvers.next(payloadData);
                }
            },
        }),
    ];

    // TODO: see how we can remove this method from types exposed to WA.state object
    initVariables(_variables: Map<string, unknown>): void {
        for (const [name, value] of _variables.entries()) {
            // In case the user already decided to put values in the variables (before onInit), let's make sure onInit does not override this.
            if (!this.variables.has(name)) {
                this.variables.set(name, value);
            }
        }
    }

    saveVariable(key: string, value: unknown): Promise<void> {
        this.variables.set(key, value);
        return queryWorkadventure({
            type: "setVariable",
            data: {
                key,
                value,
                target: this.target,
            },
        });
    }

    loadVariable(key: string): unknown {
        return this.variables.get(key);
    }

    hasVariable(key: string): boolean {
        return this.variables.has(key);
    }

    onVariableChange(key: string): Observable<unknown> {
        let subject = this.variableSubscribers.get(key);
        if (subject === undefined) {
            subject = new Subject<unknown>();
            this.variableSubscribers.set(key, subject);
        }
        return subject.asObservable();
    }
}

export function createState(target: "global" | "player"): WorkadventureStateCommands & { [key: string]: unknown } {
    return new Proxy(new WorkadventureStateCommands(target), {
        get(target: WorkadventureStateCommands, p: PropertyKey, receiver: unknown): unknown {
            if (p in target) {
                return Reflect.get(target, p, receiver);
            }
            return target.loadVariable(p.toString());
        },
        set(target: WorkadventureStateCommands, p: PropertyKey, value: unknown, receiver: unknown): boolean {
            // Note: when using "set", there is no way to wait, so we ignore the return of the promise.
            // User must use WA.state.saveVariable to have error message.
            target.saveVariable(p.toString(), value).catch((e) => console.error(e));
            return true;
        },
        has(target: WorkadventureStateCommands, p: PropertyKey): boolean {
            if (p in target) {
                return true;
            }
            return target.hasVariable(p.toString());
        },
    }) as WorkadventureStateCommands & { [key: string]: unknown };
}
