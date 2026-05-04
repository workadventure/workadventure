// Utility function to add enter / leave listeners on layers / tiled areas / map editor areas

import { Observable, concat, defer, of } from "rxjs";
import { filter, map, share } from "rxjs/operators";
import { openMessagePort } from "./IframeApiContribution";

type EnterLeaveAction = "enter" | "leave";
type EnterLeaveEvent = { reason: "initial" | "move" };
type EnterLeavePortEvent = {
    action: EnterLeaveAction;
    data: EnterLeaveEvent;
};

const observables = {
    layer: {
        stream: new Map<string, Observable<EnterLeavePortEvent>>(),
        status: new Map<string, "in" | "out">(),
    },
    tiledArea: {
        stream: new Map<string, Observable<EnterLeavePortEvent>>(),
        status: new Map<string, "in" | "out">(),
    },
    mapEditorArea: {
        stream: new Map<string, Observable<EnterLeavePortEvent>>(),
        status: new Map<string, "in" | "out">(),
    },
};

/**
 * Register an observer that will trigger when a layer / Tiled area / Map Editor area is entered or left.
 * The actual registration happens on first subscribe and is stopped on last subscribe.
 * The port is shared among all subscribers (opened once, closed when the last subscriber unsubscribes).
 * If the user is already in the correct state when subscribing, the observable triggers immediately
 * (except for the very first subscriber: the server side sends the current state on port creation).
 */
export function getEnterLeaveObservable(
    type: "layer" | "tiledArea" | "mapEditorArea",
    action: EnterLeaveAction,
    name: string
): Observable<EnterLeaveEvent> {
    const streamsMap = observables[type].stream;

    // Retrieve or create the shared (hot) observable backed by a single port per zone.
    let sharedPort = streamsMap.get(name);
    if (sharedPort === undefined) {
        sharedPort = new Observable<EnterLeavePortEvent>((subscriber) => {
            const abortController = new AbortController();

            (async () => {
                const port = await openMessagePort("enterLeave", {
                    type,
                    action: "watch",
                    zoneName: name,
                });

                if (abortController.signal.aborted) {
                    port.close();
                    return;
                }

                const subscription = port.messages.subscribe((event) => {
                    switch (event.data.type) {
                        case "onAction": {
                            observables[type].status.set(name, event.data.action === "enter" ? "in" : "out");
                            subscriber.next({
                                action: event.data.action,
                                data: event.data.data,
                            });
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
                streamsMap.delete(name);
                observables[type].status.delete(name);
            };
        }).pipe(
            // share() makes this observable hot: the port is opened on the first subscribe
            // and reused for all subsequent subscribers. It is closed when the last subscriber unsubscribes.
            share()
        );

        streamsMap.set(name, sharedPort);
    }

    // defer() re-evaluates on every subscribe call, so the status check reflects the state
    // at subscription time. If the user is already in the correct state (and this is not the
    // first subscriber — the server handles the initial state for the first one), emit immediately.
    const capturedSharedPort = sharedPort;
    const actionStream = capturedSharedPort.pipe(
        filter((event) => event.action === action),
        map((event) => event.data)
    );
    return defer(() => {
        const status = observables[type].status.get(name);
        const shouldEmitNow = (status === "in" && action === "enter") || (status === "out" && action === "leave");

        return shouldEmitNow
            ? concat(
                  of({
                      reason: "initial" as const,
                  }),
                  actionStream
              )
            : actionStream;
    });
}
