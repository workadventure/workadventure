import type { Readable } from "svelte/store";
import { derived } from "svelte/store";

/**
 * This function takes a Readable store of MediaStream and returns a new Readable store of MediaStream
 * that only contains video tracks. If there are no video tracks, the store will be undefined.
 */
export function muteMediaStreamStore(
    streamStore: Readable<MediaStream | undefined>
): Readable<MediaStream | undefined> {
    // Create a single MediaStream that will be reused
    const mutedStream = new MediaStream();

    return derived(streamStore, (stream, set) => {
        if (!stream) {
            // Remove all existing tracks from the muted stream to prevent memory leaks
            mutedStream.getTracks().forEach((track) => mutedStream.removeTrack(track));
            set(undefined);
            return;
        }

        const updateStream = () => {
            const videoTracks = stream.getVideoTracks();

            // Remove all existing tracks from the muted stream
            mutedStream.getTracks().forEach((track) => mutedStream.removeTrack(track));

            // Add current video tracks to the muted stream
            videoTracks.forEach((track) => mutedStream.addTrack(track));

            set(videoTracks.length > 0 ? mutedStream : undefined);
        };

        const onTrackChange = (event: MediaStreamTrackEvent) => {
            if (event.track.kind === "video") {
                updateStream();
            }
        };

        stream.addEventListener("addtrack", onTrackChange);
        stream.addEventListener("removetrack", onTrackChange);

        updateStream();

        return () => {
            stream.removeEventListener("addtrack", onTrackChange);
            stream.removeEventListener("removetrack", onTrackChange);
        };
    });
}
