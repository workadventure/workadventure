import { derived, type Readable } from "svelte/store";

type MediaStreamTrackKind = "audio" | "video";

export function createMediaStreamTrackPresenceStore(
    streamStore: Readable<MediaStream | undefined>,
    kind: MediaStreamTrackKind,
    isTrackPresent: (track: MediaStreamTrack) => boolean = isUsableMediaStreamTrack,
): Readable<boolean> {
    return derived(
        streamStore,
        (stream, set) => {
            if (!stream) {
                set(false);
                return;
            }

            const trackCleanups = new Map<MediaStreamTrack, () => void>();

            const update = () => {
                syncTrackListeners();
                set(stream.getTracks().some((track) => track.kind === kind && isTrackPresent(track)));
            };

            const syncTrackListeners = () => {
                const currentTracks = new Set(stream.getTracks().filter((track) => track.kind === kind));

                for (const [track, cleanup] of trackCleanups) {
                    if (!currentTracks.has(track)) {
                        cleanup();
                        trackCleanups.delete(track);
                    }
                }

                for (const track of currentTracks) {
                    if (trackCleanups.has(track)) {
                        continue;
                    }
                    if (
                        typeof track.addEventListener !== "function" ||
                        typeof track.removeEventListener !== "function"
                    ) {
                        continue;
                    }

                    const onTrackStateChange = () => update();
                    track.addEventListener("mute", onTrackStateChange);
                    track.addEventListener("unmute", onTrackStateChange);
                    track.addEventListener("ended", onTrackStateChange);

                    trackCleanups.set(track, () => {
                        track.removeEventListener("mute", onTrackStateChange);
                        track.removeEventListener("unmute", onTrackStateChange);
                        track.removeEventListener("ended", onTrackStateChange);
                    });
                }
            };

            const canListenToStreamTrackChanges =
                typeof stream.addEventListener === "function" && typeof stream.removeEventListener === "function";
            let onStreamTrackChange: ((event: MediaStreamTrackEvent) => void) | undefined;

            if (canListenToStreamTrackChanges) {
                onStreamTrackChange = (event: MediaStreamTrackEvent) => {
                    if (event.track.kind === kind) {
                        update();
                    }
                };

                stream.addEventListener("addtrack", onStreamTrackChange);
                stream.addEventListener("removetrack", onStreamTrackChange);
            }
            update();

            return () => {
                if (onStreamTrackChange) {
                    stream.removeEventListener("addtrack", onStreamTrackChange);
                    stream.removeEventListener("removetrack", onStreamTrackChange);
                }
                trackCleanups.forEach((cleanup) => cleanup());
            };
        },
        false,
    );
}

export function isUsableMediaStreamTrack(track: MediaStreamTrack): boolean {
    return track.readyState === "live" && !track.muted && track.enabled !== false;
}
