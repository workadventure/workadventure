import { get, Readable, Unsubscriber } from "svelte/store";

export function storeToPromise<T>(store: Readable<T>): Promise<T> {
    return new Promise((resolve) => {
        let unsubscribe: Unsubscriber | undefined;
        let isSubscribeFirstCall = true;
        //let numberofCalls = 0;
        unsubscribe = store.subscribe((value) => {
            if (isSubscribeFirstCall) {
                // console.log("First call of subscribe, ignore it",get(value[value.length-1].content));
                //numberofCalls++;
                isSubscribeFirstCall = false;
            } else {
                console.log(store);
                // console.log("first msg >>>>>>>>>>>>>>",get(value[value.length-1].content));
                resolve(value);
                if (unsubscribe) {
                    unsubscribe();
                }
            }
        });
    });
}
