// Utility function to add enter / leave listeners on layers / tiled areas / map editor areas

import { Observable, concat, defer, of } from "rxjs";
import { share } from "rxjs/operators";
import { openMessagePort } from "./IframeApiContribution";

const observables = {
    layer: {
        enter: new Map<string, Observable<void>>(),
        leave: new Map<string, Observable<void>>(),
        status: new Map<string, "in" | "out">(),
    },
    tiledArea: {
        enter: new Map<string, Observable<void>>(),
        leave: new Map<string, Observable<void>>(),
        status: new Map<string, "in" | "out">(),
    },
    mapEditorArea: {
        enter: new Map<string, Observable<void>>(),
        leave: new Map<string, Observable<void>>(),
        status: new Map<string, "in" | "out">(),
    },
};

/**
 * Register an observer that will trigger when a layer / Tiled area / Map Editor area is entered or leaved.
 * The actual registration happens on first subscribe and is stopped on last subscribe.
 * The port is shared among all subscribers (opened once, closed when the last subscriber unsubscribes).
 * If the user is already in the correct state when subscribing, the observable triggers immediately
 * (except for the very first subscriber: the server side sends the current state on port creation).
 */
export function getEnterLeaveObservable(
    type: "layer" | "tiledArea" | "mapEditorArea",
    action: "enter" | "leave",
    name: string
): Observable<void> {
    const observablesMap = observables[type][action];

    // Retrieve or create the shared (hot) observable backed by a single port.
    let sharedPort = observablesMap.get(name);
    if (sharedPort === undefined) {
        sharedPort = new Observable<void>((subscriber) => {
            const abortController = new AbortController();

            (async () => {
                const port = await openMessagePort("enterLeave", {
                    type,
                    action,
                    zoneName: name,
                });

                if (abortController.signal.aborted) {
                    port.close();
                    return;
                }

                const subscription = port.messages.subscribe((event) => {
                    switch (event.data.type) {
                        case "onAction": {
                            observables[type].status.set(name, action === "enter" ? "in" : "out");
                            subscriber.next();
                            break;
                        }
                        default: {
                            const _exhaustiveCheck: never = event.data.type;
                        }
                    }
                });

                // eslint-disable-next-line listeners/no-inline-function-event-listener, listeners/no-missing-remove-event-listener
                abortController.signal.addEventListener("abort", () => {
                    subscription.unsubscribe();
                    port.close();
                });
            })().catch((e) => {
                console.error(e);
                subscriber.error(e);
            });

            return () => {
                abortController.abort();
                observablesMap.delete(name);
                if (
                    observables[type]["enter"].get(name) === undefined &&
                    observables[type]["leave"].get(name) === undefined
                ) {
                    observables[type].status.delete(name);
                }
            };
        }).pipe(
            // share() makes this observable hot: the port is opened on the first subscribe
            // and reused for all subsequent subscribers. It is closed when the last subscriber unsubscribes.
            share()
        );

        observablesMap.set(name, sharedPort);
    }

    // defer() re-evaluates on every subscribe call, so the status check reflects the state
    // at subscription time. If the user is already in the correct state (and this is not the
    // first subscriber — the server handles the initial state for the first one), emit immediately.
    const capturedSharedPort = sharedPort;
    return defer(() => {
        const status = observables[type].status.get(name);
        const shouldEmitNow = (status === "in" && action === "enter") || (status === "out" && action === "leave");

        return shouldEmitNow ? concat(of(undefined as void), capturedSharedPort) : capturedSharedPort;
    });
}
