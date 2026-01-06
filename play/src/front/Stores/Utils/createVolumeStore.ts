import { readable, type Readable } from "svelte/store";
import { SoundMeter } from "../../Phaser/Components/SoundMeter";

/**
 * Creates a volume store that monitors the audio volume of a media stream
 * @param streamStore - The store containing the media stream to monitor
 * @returns A readable store that emits volume data as an array of numbers
 */
export function createVolumeStore(streamStore: Readable<MediaStream | undefined>): Readable<number[] | undefined> {
    return readable<number[] | undefined>(undefined, (set) => {
        let soundMeter: SoundMeter | undefined;
        let timeout: NodeJS.Timeout | undefined;

        const volumeStoreSubscribe = streamStore.subscribe((mediaStream) => {
            if (soundMeter) {
                soundMeter.stop();
            }
            if (timeout) {
                clearInterval(timeout);
            }

            if (mediaStream === undefined || mediaStream.getAudioTracks().length <= 0) {
                set(undefined);
                return;
            }

            soundMeter = new SoundMeter(mediaStream);
            let error = false;

            timeout = setInterval(() => {
                try {
                    set(soundMeter?.getVolume());
                } catch (err) {
                    if (!error) {
                        console.error(err);
                        error = true;
                    }
                }
            }, 100);
        });

        return () => {
            set(undefined);
            if (soundMeter) {
                soundMeter.stop();
            }
            if (timeout) {
                clearInterval(timeout);
            }
            volumeStoreSubscribe();
        };
    });
}
