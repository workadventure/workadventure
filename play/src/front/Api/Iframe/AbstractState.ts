import type { Observable } from "rxjs";
import { Subject } from "rxjs";

import type { SetVariableEvent } from "../Events/SetVariableEvent";

export abstract class AbstractWorkadventureStateCommands {
    protected setVariableResolvers = new Subject<SetVariableEvent>();
    protected variables = new Map<string, unknown>();
    protected variableSubscribers = new Map<string, Subject<unknown>>();

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
            this.variables.set(event.key, event.value);
            const subject = this.variableSubscribers.get(event.key);
            if (subject !== undefined) {
                subject.next(event.value);
            }
        });
    }

    // TODO: see how we can remove this method from types exposed to WA.state object
    initVariables(_variables: Map<string, unknown>): void {
        for (const [name, value] of _variables.entries()) {
            // In case the user already decided to put values in the variables (before onInit), let's make sure onInit does not override this.
            if (!this.variables.has(name)) {
                this.variables.set(name, value);
            }
        }
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
