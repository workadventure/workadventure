import type { MeetingParticipant } from "../../../Stores/MeetingInvitationStore";
import { DEFAULT_PROXIMITY_SPACE_NAME } from "../../../Chat/Connection/Proximity/ProximityChatRoomManager";

const DEFAULT_PROXIMITY_ROOM_ID = `proximity:${DEFAULT_PROXIMITY_SPACE_NAME}`;

export type ProximityParticipantRoomSnapshot = {
    id: string;
    name: string;
    isJoined: boolean;
    participants: MeetingParticipant[];
};

export type ProximityParticipantGroup = {
    id: string;
    name: string;
    participants: MeetingParticipant[];
};

export type ProximityParticipantView = {
    participantGroups: ProximityParticipantGroup[];
    uniqueParticipants: MeetingParticipant[];
};

export function buildProximityParticipantView(
    rooms: ProximityParticipantRoomSnapshot[],
    localUuid: string,
): ProximityParticipantView {
    const participantGroups: ProximityParticipantGroup[] = [];
    const uniqueParticipantsByKey = new Map<string, MeetingParticipant>();
    const sortedRooms = rooms
        .map((room, index) => ({ room, index }))
        .sort((roomA, roomB) => {
            if (roomA.room.id === DEFAULT_PROXIMITY_ROOM_ID) {
                return -1;
            }
            if (roomB.room.id === DEFAULT_PROXIMITY_ROOM_ID) {
                return 1;
            }
            return roomA.index - roomB.index;
        })
        .map(({ room }) => room);

    for (const room of sortedRooms) {
        if (!room.isJoined) {
            continue;
        }

        const participants = room.participants.filter((participant) => participant.uuid !== localUuid);
        if (participants.length === 0) {
            continue;
        }

        participantGroups.push({
            id: room.id,
            name: room.name,
            participants,
        });

        for (const participant of participants) {
            const key = participant.uuid || participant.spaceUserId;
            if (!uniqueParticipantsByKey.has(key)) {
                uniqueParticipantsByKey.set(key, participant);
            }
        }
    }

    return {
        participantGroups,
        uniqueParticipants: Array.from(uniqueParticipantsByKey.values()),
    };
}
