import { derived, Readable } from "svelte/store";
import { LocalStreamStoreValue } from "./MediaStore";

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
                } else if (
                    currentVideoTrack &&
                    newVideoTrack &&
                    currentVideoTrack.id === newVideoTrack.id &&
                    !currentVideoTrack.enabled
                ) {
                    currentVideoTrack.enabled = true;
                } else if (newVideoTrack && !currentVideoTrack) {
                    stableLocalStream.addTrack(newVideoTrack);
                } else if (currentVideoTrack && !newVideoTrack) {
                    currentVideoTrack.enabled = false;
                }

                const newAudioTrack = stream.getAudioTracks()[0];
                const currentAudioTrack = stableLocalStream.getAudioTracks()[0];

                // replace track if it has a different id
                if (newAudioTrack && currentAudioTrack && newAudioTrack.id !== currentAudioTrack.id) {
                    stableLocalStream.removeTrack(currentAudioTrack);
                    stableLocalStream.addTrack(newAudioTrack);
                    // enable track if it exists and is disabled
                } else if (
                    currentVideoTrack &&
                    newVideoTrack &&
                    currentVideoTrack.id === newVideoTrack.id &&
                    !currentVideoTrack.enabled
                ) {
                    currentVideoTrack.enabled = true;
                }
                // add track if it doesn't exist
                else if (newAudioTrack && !currentAudioTrack) {
                    stableLocalStream.addTrack(newAudioTrack);
                }
                // disable track if it doesn't exist
                else if (currentAudioTrack && !newAudioTrack) {
                    currentAudioTrack.enabled = false;
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
