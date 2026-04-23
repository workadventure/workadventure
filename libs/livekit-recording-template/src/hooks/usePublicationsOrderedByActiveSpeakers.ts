import { useEffect, useMemo, useState } from "react";
import { type RemoteTrackPublication, Room, RoomEvent, Track } from "livekit-client";
import { participantIdentityForPublication } from "./participantIdentityForPublication";

function isScreenShare(pub: RemoteTrackPublication): boolean {
    return pub.source === Track.Source.ScreenShare;
}

/**
 * Plus le rang est bas, plus la tuile est “haute” dans la liste (mosaïque ou rail speaker).
 * - Partages écran en premier (tri par `trackSid` décroissant = proxy “plus récent”).
 * - Puis caméras dans l’ordre `room.activeSpeakers` (dominant en premier).
 * - Puis les autres caméras, ordre stable par `trackSid`.
 */
function comparePublications(
    room: Room,
    activeIdentities: readonly string[],
    a: RemoteTrackPublication,
    b: RemoteTrackPublication
): number {
    const sa = isScreenShare(a);
    const sb = isScreenShare(b);
    if (sa !== sb) {
        return sa ? -1 : 1;
    }
    if (sa && sb) {
        return b.trackSid.localeCompare(a.trackSid);
    }

    const ia = participantIdentityForPublication(room, a);
    const ib = participantIdentityForPublication(room, b);
    const ra = ia !== undefined ? activeIdentities.indexOf(ia) : -1;
    const rb = ib !== undefined ? activeIdentities.indexOf(ib) : -1;
    const rankA = ra !== -1 ? ra : 1000;
    const rankB = rb !== -1 ? rb : 1000;
    if (rankA !== rankB) {
        return rankA - rankB;
    }
    return a.trackSid.localeCompare(b.trackSid);
}

function sortPublications(room: Room, publications: RemoteTrackPublication[], activeIdentities: readonly string[]): RemoteTrackPublication[] {
    if (publications.length <= 1) {
        return publications;
    }
    return [...publications].sort((a, b) => comparePublications(room, activeIdentities, a, b));
}

/**
 * Réordonne les publications vidéo pour remonter l’intervenant actif (et les partages écran en tête),
 * à la fois pour la mosaïque (premières tuiles = plus visibles) et pour le rail speaker.
 * Se met à jour sur {@link RoomEvent.ActiveSpeakersChanged}.
 */
export function usePublicationsOrderedByActiveSpeakers(
    room: Room | undefined,
    publications: RemoteTrackPublication[]
): RemoteTrackPublication[] {
    const [activeIdentities, setActiveIdentities] = useState<readonly string[]>([]);

    useEffect(() => {
        if (!room) {
            setActiveIdentities([]);
            return;
        }

        const sync = (): void => {
            setActiveIdentities(room.activeSpeakers.map((p) => p.identity));
        };

        sync();
        room.on(RoomEvent.ActiveSpeakersChanged, sync);
        return () => {
            room.off(RoomEvent.ActiveSpeakersChanged, sync);
        };
    }, [room]);

    return useMemo(() => {
        if (!room || publications.length === 0) {
            return publications;
        }
        return sortPublications(room, publications, activeIdentities);
    }, [room, publications, activeIdentities]);
}
