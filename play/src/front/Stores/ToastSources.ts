import { derived } from "svelte/store";
import BrowserAudioInterruptedToast from "../Components/Toasts/BrowserAudioInterruptedToast.svelte";
import BrowserNoSoundInfoToast from "../Components/Toasts/BrowserNoSoundInfoToast.svelte";
import { audioInterruptedStore } from "./AudioInterruptedStore";
import { audioPlaybackStore } from "./AudioPlaybackStore";
import type { ToastSourceDefinition } from "./ToastStore";

const AUDIO_INTERRUPTED_TOAST_ID = "audio-interrupted-toast";
const AUDIO_PLAYBACK_TOAST_ID = "audio-playback-toast";

export function getToastSources(): ToastSourceDefinition[] {
    return [
        {
            source: derived(audioInterruptedStore, ($audioInterruptedStore) =>
                $audioInterruptedStore ? { component: BrowserAudioInterruptedToast, props: {} } : undefined,
            ),
            uuid: AUDIO_INTERRUPTED_TOAST_ID,
        },
        {
            source: derived(audioPlaybackStore, ($audioPlaybackStore) =>
                $audioPlaybackStore.size > 0 ? { component: BrowserNoSoundInfoToast, props: {} } : undefined,
            ),
            uuid: AUDIO_PLAYBACK_TOAST_ID,
        },
    ];
}
