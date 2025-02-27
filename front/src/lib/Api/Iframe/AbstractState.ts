import type { Observable } from "rxjs";
import { Subject } from "rxjs";

import type { SetVariableEvent } from "../Events/SetVariableEvent";

export abstract class AbstractWorkadventureStateCommands<State extends { [key: string]: unknown }> {
    protected setVariableResolvers = new Subject<SetVariableEvent>();
    protected variables: Partial<State> = {};
    protected variableSubscribers: Partial<{ [K in keyof State]: Subject<State[K]> }> = {};

    protected constructor() {
        //super();

        // Not unsubscribing is ok, this is two singletons never destroyed.
        //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
        this.setVariableResolvers.subscribe((event) => {
            // const oldValue = this.variables.get(event.key);
            // If we are setting the same value, no need to do anything.
            // No need to do this check since it is already performed in SharedVariablesManager and PlayersVariablesManager
            /*if (JSON.stringify(oldValue) === JSON.stringify(event.value)) {
                return;
            }*/
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.variables[event.key as keyof State] = event.value as any;
            const subject = this.variableSubscribers[event.key];
            if (subject !== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                subject.next(event.value as any);
            }
        });
    }

    // TODO: see how we can remove this method from types exposed to WA.state object
    initVariables(_variables: Map<string, unknown>): void {
        for (const [name, value] of _variables.entries()) {
            // In case the user already decided to put values in the variables (before onInit), let's make sure onInit does not override this.
            if (!(name in this.variables)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.variables[name as keyof State] = value as any;
            }
        }
    }

    loadVariable<K extends keyof State>(key: K): State[K] | undefined {
        return this.variables[key];
    }

    hasVariable<K extends keyof State>(key: K): boolean {
        return key in this.variables;
    }

    onVariableChange<K extends keyof State>(key: K): Observable<State[K]> {
        let subject = this.variableSubscribers[key];
        if (subject === undefined) {
            subject = new Subject<State[K]>();
            this.variableSubscribers[key] = subject;
        }
        return subject.asObservable();
    }
}
