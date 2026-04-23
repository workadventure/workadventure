import {
    isTrackReference,
    VideoTrack,
    useRoomContext,
    useTracks,
    useVisualStableUpdate,
} from "@livekit/components-react";
import { Track } from "livekit-client";

/** One remote camera/screen track, following LiveKit’s single-speaker egress pattern ({@link useVisualStableUpdate} + {@link VideoTrack}). */
export function RecordingLivekitFullscreenLayout(): JSX.Element {
    const room = useRoomContext();
    const allTracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], { onlySubscribed: true });
    const remoteTracks = allTracks.filter(
        (tr) => isTrackReference(tr) && tr.participant.identity !== room.localParticipant.identity
    );
    const stable = useVisualStableUpdate(remoteTracks, 1);
    const ref = stable[0];

    if (!ref || !isTrackReference(ref)) {
        return <div className="recording-template__mosaic recording-template__mosaic--empty" />;
    }

    return (
        <div className="recording-template__livekit-fullscreen">
            <VideoTrack trackRef={ref} />
        </div>
    );
}
