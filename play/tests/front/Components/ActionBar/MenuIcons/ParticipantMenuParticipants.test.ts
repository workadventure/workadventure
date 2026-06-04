import { describe, expect, it } from "vitest";
import { readable } from "svelte/store";
import type { MeetingParticipant } from "../../../../../src/front/Stores/MeetingInvitationStore";
import { buildProximityParticipantView } from "../../../../../src/front/Components/ActionBar/MenuIcons/ParticipantMenuParticipants";
import { DEFAULT_PROXIMITY_SPACE_NAME } from "../../../../../src/front/Chat/Connection/Proximity/ProximityChatRoomManager";

const DEFAULT_PROXIMITY_ROOM_ID = `proximity:${DEFAULT_PROXIMITY_SPACE_NAME}`;

function participant(name: string, uuid = name.toLowerCase(), spaceUserId = `${uuid}-space`): MeetingParticipant {
    return {
        spaceUserId,
        name,
        uuid,
        pictureStore: readable(undefined),
        playUri: "",
        roomName: undefined,
        tags: [],
        cameraState: false,
        microphoneState: false,
        screenSharingState: false,
    };
}

describe("buildProximityParticipantView", () => {
    it("groups joined proximity participants and excludes the local user", () => {
        const bob = participant("Bob", "bob");
        const local = participant("Alice", "alice");

        const view = buildProximityParticipantView(
            [
                {
                    id: DEFAULT_PROXIMITY_ROOM_ID,
                    name: "Proximity Chat",
                    isJoined: true,
                    participants: [bob, local],
                },
            ],
            "alice"
        );

        expect(view.participantGroups).toEqual([
            {
                id: DEFAULT_PROXIMITY_ROOM_ID,
                name: "Proximity Chat",
                participants: [bob],
            },
        ]);
        expect(view.uniqueParticipants).toEqual([bob]);
    });

    it("keeps default proximity first, then joined room groups in room order, and ignores empty or left rooms", () => {
        const bob = participant("Bob", "bob");
        const carol = participant("Carol", "carol");

        const view = buildProximityParticipantView(
            [
                {
                    id: "proximity:listener",
                    name: "Listener",
                    isJoined: true,
                    participants: [carol],
                },
                {
                    id: DEFAULT_PROXIMITY_ROOM_ID,
                    name: "Proximity Chat",
                    isJoined: true,
                    participants: [bob],
                },
                {
                    id: "proximity:empty",
                    name: "Empty",
                    isJoined: true,
                    participants: [],
                },
                {
                    id: "proximity:left",
                    name: "Left",
                    isJoined: false,
                    participants: [participant("Dave", "dave")],
                },
            ],
            "alice"
        );

        expect(view.participantGroups.map((group) => group.name)).toEqual(["Proximity Chat", "Listener"]);
        expect(view.uniqueParticipants.map((item) => item.name)).toEqual(["Bob", "Carol"]);
    });

    it("keeps duplicate users in separate groups but deduplicates the compact stack", () => {
        const bobInBubble = participant("Bob", "bob", "bubble-bob");
        const bobInListener = participant("Bob", "bob", "listener-bob");

        const view = buildProximityParticipantView(
            [
                {
                    id: DEFAULT_PROXIMITY_ROOM_ID,
                    name: "Proximity Chat",
                    isJoined: true,
                    participants: [bobInBubble],
                },
                {
                    id: "proximity:listener",
                    name: "Listener",
                    isJoined: true,
                    participants: [bobInListener],
                },
            ],
            "alice"
        );

        expect(view.participantGroups.map((group) => group.participants)).toEqual([[bobInBubble], [bobInListener]]);
        expect(view.uniqueParticipants).toEqual([bobInBubble]);
    });
});
