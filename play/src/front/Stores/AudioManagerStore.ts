import { get, Writable, writable } from "svelte/store";
import { Subject } from "rxjs";
import { localUserStore } from "../Connection/LocalUserStore";
import { peerStore } from "./PeerStore";
import { activeSecondaryZoneActionBarStore } from "./MenuStore";

export interface AudioManagerVolume {
    muted: boolean;
    volume: number;
    decreaseWhileTalking: boolean;
    volumeReduced: boolean;
    loop: boolean;
    talking: boolean;
}

function createAudioManagerVolumeStore() {
    const { subscribe, update } = writable<AudioManagerVolume>({
        muted: false,
        volume: 1,
        decreaseWhileTalking: true,
        volumeReduced: false,
        loop: false,
        talking: false,
    });

    return {
        subscribe,
        setMuted: (newMute: boolean): void => {
            update((audioPlayerVolume: AudioManagerVolume) => {
                audioPlayerVolume.muted = newMute;
                return audioPlayerVolume;
            });
        },
        setVolume: (newVolume: number): void => {
            update((audioPlayerVolume: AudioManagerVolume) => {
                audioPlayerVolume.volume = newVolume;
                return audioPlayerVolume;
            });
        },
        setDecreaseWhileTalking: (newDecrease: boolean): void => {
            update((audioManagerVolume: AudioManagerVolume) => {
                audioManagerVolume.decreaseWhileTalking = newDecrease;
                return audioManagerVolume;
            });
        },
        setVolumeReduced: (newVolumeReduced: boolean): void => {
            update((audioManagerVolume: AudioManagerVolume) => {
                audioManagerVolume.volumeReduced = newVolumeReduced;
                return audioManagerVolume;
            });
        },
        setLoop: (newLoop: boolean): void => {
            update((audioManagerVolume: AudioManagerVolume) => {
                audioManagerVolume.loop = newLoop;
                return audioManagerVolume;
            });
        },
        setTalking: (newTalk: boolean): void => {
            update((audioManagerVolume: AudioManagerVolume) => {
                audioManagerVolume.talking = newTalk;
                return audioManagerVolume;
            });
        },
    };
}

function createAudioManagerFileStore() {
    const { subscribe, update } = writable<string>("");

    return {
        subscribe,
        playAudio: (url: string | number | boolean, mapUrl: string, volume: number | undefined, loop = false): void => {
            update((file: string) => {
                const audioPath = String(url);

                file = new URL(audioPath, mapUrl).toString();

                audioManagerVolumeStore.setVolume(
                    volume ? Math.min(volume, get(audioManagerVolumeStore).volume) : get(audioManagerVolumeStore).volume
                );
                audioManagerVolumeStore.setLoop(loop);

                return file;
            });
        },
        unloadAudio: () => {
            update(() => {
                audioManagerVolumeStore.setLoop(false);
                activeSecondaryZoneActionBarStore.set(undefined);
                return "";
            });
        },
    };
}

// Store deciding the visibility of the music icon in the action bar and its status
export const audioManagerVisibilityStore: Writable<"hidden" | "visible" | "disabledBySettings" | "error"> =
    writable("hidden");

export const audioManagerVolumeStore = createAudioManagerVolumeStore();
export const audioManagerFileStore = createAudioManagerFileStore();
export const audioManagerPlayerState: Writable<"loading" | "playing" | "not_allowed" | "error" | undefined> =
    writable(undefined);
// Store solely used to trigger a retry of the audio player (in case the browser blocked it the first time)
export const audioManagerRetryPlaySubject = new Subject<void>();

// Store for bubble sound preference
export const bubbleSoundStore = writable<"ding" | "wobble">(localUserStore.getBubbleSound());

// Not unsubscribing is ok, this is a singleton.
//eslint-disable-next-line svelte/no-ignored-unsubscribe
peerStore.subscribe((peers) => {
    audioManagerVolumeStore.setTalking(peers.size > 0);
});
