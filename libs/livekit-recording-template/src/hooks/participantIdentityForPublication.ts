import type { RemoteTrackPublication, Room } from "livekit-client";

/** Résout l’identité LiveKit du participant qui porte cette publication (remote). */
export function participantIdentityForPublication(room: Room, publication: RemoteTrackPublication): string | undefined {
    for (const participant of room.remoteParticipants.values()) {
        const pub = participant.getTrackPublicationBySid(publication.trackSid);
        if (pub === publication) {
            return participant.identity;
        }
    }
    return undefined;
}
