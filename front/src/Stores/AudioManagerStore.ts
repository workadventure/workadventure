import { get, writable } from "svelte/store";
import { peerStore } from "./PeerStore";

export interface audioManagerVolume {
    muted: boolean;
    volume: number;
    decreaseWhileTalking: boolean;
    volumeReduced: boolean;
    loop: boolean;
    talking: boolean;
}

function createAudioManagerVolumeStore() {
    const { subscribe, update } = writable<audioManagerVolume>({
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
            update((audioPlayerVolume: audioManagerVolume) => {
                audioPlayerVolume.muted = newMute;
                return audioPlayerVolume;
            });
        },
        setVolume: (newVolume: number): void => {
            update((audioPlayerVolume: audioManagerVolume) => {
                audioPlayerVolume.volume = newVolume;
                return audioPlayerVolume;
            });
        },
        setDecreaseWhileTalking: (newDecrease: boolean): void => {
            update((audioManagerVolume: audioManagerVolume) => {
                audioManagerVolume.decreaseWhileTalking = newDecrease;
                return audioManagerVolume;
            });
        },
        setVolumeReduced: (newVolumeReduced: boolean): void => {
            update((audioManagerVolume: audioManagerVolume) => {
                audioManagerVolume.volumeReduced = newVolumeReduced;
                return audioManagerVolume;
            });
        },
        setLoop: (newLoop: boolean): void => {
            update((audioManagerVolume: audioManagerVolume) => {
                audioManagerVolume.loop = newLoop;
                return audioManagerVolume;
            });
        },
        setTalking: (newTalk: boolean): void => {
            update((audioManagerVolume: audioManagerVolume) => {
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
        playAudio: (
            url: string | number | boolean,
            mapDirUrl: string,
            volume: number | undefined,
            loop = false
        ): void => {
            update((file: string) => {
                const audioPath = url as string;

                if (audioPath.indexOf("://") > 0) {
                    // remote file or stream
                    file = audioPath;
                } else {
                    // local file, include it relative to map directory
                    file = mapDirUrl + "/" + url;
                }
                audioManagerVolumeStore.setVolume(
                    volume ? Math.min(volume, get(audioManagerVolumeStore).volume) : get(audioManagerVolumeStore).volume
                );
                audioManagerVolumeStore.setLoop(loop);

                return file;
            });
        },
        unloadAudio: () => {
            update((file: string) => {
                audioManagerVolumeStore.setLoop(false);
                return "";
            });
        },
    };
}

export const audioManagerVisibilityStore = writable(false);

export const audioManagerVolumeStore = createAudioManagerVolumeStore();

export const audioManagerFileStore = createAudioManagerFileStore();

peerStore.subscribe((peers) => {
    audioManagerVolumeStore.setTalking(peers.size > 0);
});
