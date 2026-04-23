import { useEffect, useState } from "react";
import type { RemoteTrackPublication, Room } from "livekit-client";
import { RoomEvent, Track } from "livekit-client";

function collectRemoteVideoPublications(room: Room): RemoteTrackPublication[] {
    const publications: RemoteTrackPublication[] = [];
    for (const participant of room.remoteParticipants.values()) {
        for (const publication of participant.trackPublications.values()) {
            if (publication.kind !== Track.Kind.Video) {
                continue;
            }
            if (!publication.isSubscribed || !publication.track) {
                continue;
            }
            publications.push(publication);
        }
    }
    return publications;
}

/**
 * Subscribed remote camera / screen-share video publications in the room.
 * Re-renders when participants or tracks change.
 */
export function useRemoteVideoPublications(room: Room | undefined): RemoteTrackPublication[] {
    const [publications, setPublications] = useState<RemoteTrackPublication[]>([]);

    useEffect(() => {
        if (!room) {
            setPublications([]);
            return;
        }

        const refresh = (): void => {
            setPublications(collectRemoteVideoPublications(room));
        };

        refresh();
        room.on(RoomEvent.TrackSubscribed, refresh);
        room.on(RoomEvent.TrackUnsubscribed, refresh);
        room.on(RoomEvent.ParticipantConnected, refresh);
        room.on(RoomEvent.ParticipantDisconnected, refresh);

        return () => {
            room.off(RoomEvent.TrackSubscribed, refresh);
            room.off(RoomEvent.TrackUnsubscribed, refresh);
            room.off(RoomEvent.ParticipantConnected, refresh);
            room.off(RoomEvent.ParticipantDisconnected, refresh);
        };
    }, [room]);

    return publications;
}
