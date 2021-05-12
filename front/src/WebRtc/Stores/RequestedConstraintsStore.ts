import { derived, writable, Writable } from "svelte/store";

class RequestedConstraintsStore {
    constructor(
        public camera: Writable<boolean> = writable(false),
        public microphone: Writable<boolean> = writable(false),
    ) { }

    get fullname() {
        // Use derived to access writable values and export as readonly
        return derived(
            [this.camera, this.microphone],
            ([$camera, $microphone]) => {
                console.log("cam or mic", $camera || $microphone)
                return $camera || $microphone;
            }
        )
    }
}

// Export a singleton
export const myFormStore = new MyFormStore();
