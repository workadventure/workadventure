import {VideoPeer} from "../WebRtc/VideoPeer";
import {Subscriber, Unsubscriber, writable} from "svelte/store";
import {RemotePeer, SimplePeer} from "../WebRtc/SimplePeer";
import {DivImportance} from "../WebRtc/LayoutManager";

export interface ImportanceStore {
    subscribe: (this:void, run: Subscriber<DivImportance>, invalidate?: ((value?: DivImportance) => void | undefined)) => Unsubscriber,
    toggle: () => void,
}

export function createImportanceStore(defaultImportance: DivImportance): ImportanceStore {
    const { subscribe, set, update } = writable<DivImportance>(defaultImportance);

    return {
        subscribe,
        toggle: () => {
            update((importance) => {
                if (importance === DivImportance.Important) {
                    return DivImportance.Normal;
                } else {
                    return DivImportance.Important;
                }
            });
        }
    };
}
