import { get } from "svelte/store";
import { afterEach, describe, expect, it } from "vitest";
import BrowserAudioInterruptedToast from "../Components/Toasts/BrowserAudioInterruptedToast.svelte";
import { audioInterruptedStore } from "./AudioInterruptedStore";
import { createToastStore } from "./ToastStore";
import { getToastSources } from "./ToastSources";

describe("ToastSources", () => {
    afterEach(() => {
        audioInterruptedStore.setInterrupted(false);
    });

    it("registers the audio interrupted toast source", () => {
        const store = createToastStore(getToastSources());

        expect(get(store).has("audio-interrupted-toast")).toBe(false);

        audioInterruptedStore.setInterrupted(true);

        expect(get(store).get("audio-interrupted-toast")).toEqual({
            component: BrowserAudioInterruptedToast,
            props: {
                toastUuid: "audio-interrupted-toast",
            },
        });

        audioInterruptedStore.setInterrupted(false);

        expect(get(store).has("audio-interrupted-toast")).toBe(false);
    });
});
