import { useEffect, useMemo, useState } from "react";
import { RemoteTrackPublication, Room, RoomEvent, Track } from "livekit-client";
import { participantIdentityForPublication } from "./participantIdentityForPublication";

function isScreenShare(pub: RemoteTrackPublication): boolean {
    return pub.source === Track.Source.ScreenShare;
}

/**
 * Chooses the large "main" tile: latest screen share (by trackSid, stable proxy for recency), else
 * the active speaker's camera, else the first available video.
 */
export function useSpeakerFeaturedPublication(
    room: Room | undefined,
    publications: RemoteTrackPublication[]
): RemoteTrackPublication | undefined {
    const [activeSpeakerIdentity, setActiveSpeakerIdentity] = useState<string | null>(null);

    useEffect(() => {
        if (!room) {
            setActiveSpeakerIdentity(null);
            return;
        }

        const sync = (): void => {
            const dominant = room.activeSpeakers[0];
            setActiveSpeakerIdentity(dominant?.identity ?? null);
        };

        sync();
        room.on(RoomEvent.ActiveSpeakersChanged, sync);
        return () => {
            room.off(RoomEvent.ActiveSpeakersChanged, sync);
        };
    }, [room]);

    return useMemo(() => {
        if (publications.length === 0) {
            return undefined;
        }

        const screens = publications.filter(isScreenShare).sort((a, b) => b.trackSid.localeCompare(a.trackSid));
        if (screens.length > 0) {
            return screens[0];
        }

        if (activeSpeakerIdentity && room) {
            const camera = publications.find(
                (p) => !isScreenShare(p) && participantIdentityForPublication(room, p) === activeSpeakerIdentity
            );
            if (camera) {
                return camera;
            }
        }

        return publications[0];
    }, [publications, activeSpeakerIdentity, room]);
}
