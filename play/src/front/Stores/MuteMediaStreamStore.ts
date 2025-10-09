import { derived, Readable } from "svelte/store";

/**
 * This function takes a Readable store of MediaStream and returns a new Readable store of MediaStream
 * that only contains video tracks. If there are no video tracks, the store will be undefined.
 */
export function muteMediaStreamStore(
    streamStore: Readable<MediaStream | undefined>
): Readable<MediaStream | undefined> {
    return derived(streamStore, (stream, set) => {
        if (stream) {
            const onAddTrack = (event: MediaStreamTrackEvent) => {
                if (event.track.kind === "video") {
                    // If a video track is added, we need to create a new stream with the video tracks
                    const videoTracks = stream.getVideoTracks();
                    if (videoTracks.length > 0) {
                        set(new MediaStream(videoTracks));
                    } else {
                        set(undefined);
                    }
                }
            };

            const onRemoveTrack = (event: MediaStreamTrackEvent) => {
                if (event.track.kind === "video") {
                    // If a video track is removed, we need to create a new stream with the video tracks
                    const videoTracks = stream.getVideoTracks();
                    if (videoTracks.length > 0) {
                        set(new MediaStream(videoTracks));
                    } else {
                        set(undefined);
                    }
                }
            };

            stream.addEventListener("addtrack", onAddTrack);
            stream.addEventListener("removetrack", onRemoveTrack);

            // Initial setting of the stream
            const videoTracks = stream.getVideoTracks();
            if (videoTracks.length > 0) {
                set(new MediaStream(videoTracks));
            } else {
                set(undefined);
            }

            return () => {
                stream.removeEventListener("addtrack", onAddTrack);
                stream.removeEventListener("removetrack", onRemoveTrack);
            };
        }
        set(undefined);
        return;
    });
}
