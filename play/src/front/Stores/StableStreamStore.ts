import type { Readable } from "svelte/store";
import { derived } from "svelte/store";
import type { LocalStreamStoreValue } from "./MediaStore";

/**
 * Stable stores are here to "stabilize" the MediaStream object given by the source stream store.
 * Source stream stores create new MediaStream instances when the tracks change, which makes it hard to use in simple-peer
 * because the replaceTrack method of simple-peer requires the MediaStream object to be the same (for no good reason,
 * as documented here: https://github.com/feross/simple-peer/issues/634)
 */
export function createStableStreamStore(sourceStreamStore: Readable<LocalStreamStoreValue>) {
    const stableLocalStream = new MediaStream();

    return derived<[typeof sourceStreamStore], LocalStreamStoreValue>([sourceStreamStore], ([$sourceStreamStore]) => {
        if ($sourceStreamStore.type === "success") {
            const stream = $sourceStreamStore.stream;

            if (stream) {
                const newVideoTrack = stream.getVideoTracks()[0];
                const currentVideoTrack = stableLocalStream.getVideoTracks()[0];

                if (newVideoTrack && currentVideoTrack && newVideoTrack.id !== currentVideoTrack.id) {
                    stableLocalStream.removeTrack(currentVideoTrack);
                    stableLocalStream.addTrack(newVideoTrack);
                } else if (newVideoTrack && !currentVideoTrack) {
                    stableLocalStream.addTrack(newVideoTrack);
                } else if (currentVideoTrack && !newVideoTrack) {
                    stableLocalStream.removeTrack(currentVideoTrack);
                }

                const newAudioTrack = stream.getAudioTracks()[0];
                const currentAudioTrack = stableLocalStream.getAudioTracks()[0];

                if (newAudioTrack && currentAudioTrack && newAudioTrack.id !== currentAudioTrack.id) {
                    stableLocalStream.removeTrack(currentAudioTrack);
                    stableLocalStream.addTrack(newAudioTrack);
                } else if (newAudioTrack && !currentAudioTrack) {
                    stableLocalStream.addTrack(newAudioTrack);
                } else if (currentAudioTrack && !newAudioTrack) {
                    stableLocalStream.removeTrack(currentAudioTrack);
                }
                return {
                    ...$sourceStreamStore,
                    stream: stableLocalStream,
                };
            }
        }
        return $sourceStreamStore;
    });
}
