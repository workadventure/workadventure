import { describe, expect, it } from "vitest";
import type { WAMFileFormat } from "@workadventure/map-editor";
import { Jitsi } from "@workadventure/shared-utils";
import { applyModerationRights, isModerationEvent } from "../src/Model/ModerationRights";
import { findLivekitRoomAdminTag } from "../src/Services/ModeratorTagFinder";

const roomUrl = "https://play.workadventure.test/@/tcm/workadventure/map";

function wamWithMeetingRoom(roomName: string, livekitRoomAdminTag: string): WAMFileFormat {
    return {
        version: "1.0.0",
        mapUrl: "map.tmj",
        entities: {},
        areas: [
            {
                id: "area-1",
                name: "Meeting",
                x: 0,
                y: 0,
                width: 10,
                height: 10,
                visible: true,
                properties: [
                    {
                        id: "property-1",
                        type: "livekitRoomProperty",
                        roomName,
                        livekitRoomConfig: { startWithAudioMuted: false, startWithVideoMuted: false },
                        livekitRoomAdminTag,
                    },
                ],
            },
        ],
        entityCollections: [],
    } as unknown as WAMFileFormat;
}

describe("findLivekitRoomAdminTag", () => {
    it("finds the tag of the meeting room the front joins", () => {
        const wam = wamWithMeetingRoom("Salle 5", "staff");
        const spaceName = Jitsi.slugifyJitsiRoomName("Salle 5", roomUrl).trim();
        expect(findLivekitRoomAdminTag(wam, roomUrl, spaceName)).toBe("staff");
    });

    it("uses the property id when the room has no name, as the front does", () => {
        const wam = wamWithMeetingRoom("", "staff");
        const spaceName = Jitsi.slugifyJitsiRoomName("property-1", roomUrl).trim();
        expect(findLivekitRoomAdminTag(wam, roomUrl, spaceName)).toBe("staff");
    });

    it("finds nothing for another room or an empty tag", () => {
        const spaceName = Jitsi.slugifyJitsiRoomName("Salle 5", roomUrl).trim();
        expect(findLivekitRoomAdminTag(wamWithMeetingRoom("Salle 6", "staff"), roomUrl, spaceName)).toBeUndefined();
        expect(findLivekitRoomAdminTag(wamWithMeetingRoom("Salle 5", ""), roomUrl, spaceName)).toBeUndefined();
        expect(findLivekitRoomAdminTag(undefined, roomUrl, spaceName)).toBeUndefined();
    });
});

describe("applyModerationRights", () => {
    it("forces the mute of a moderator, and only asks for anybody else even if the client sent force", () => {
        const event = { $case: "muteAudio", muteAudio: { force: true } } as const;
        expect(applyModerationRights(event, true)).toEqual({ $case: "muteAudio", muteAudio: { force: true } });
        expect(applyModerationRights(event, false)).toEqual({ $case: "muteAudio", muteAudio: { force: false } });
        expect(applyModerationRights({ $case: "muteVideo", muteVideo: { force: false } }, true)).toEqual({
            $case: "muteVideo",
            muteVideo: { force: true },
        });
    });

    it("drops a removal sent by somebody who does not moderate", () => {
        const event = { $case: "kickOffUser", kickOffUser: {} } as const;
        expect(applyModerationRights(event, true)).toBe(event);
        expect(applyModerationRights(event, false)).toBeUndefined();
    });

    it("only treats the moderation events", () => {
        expect(isModerationEvent({ $case: "kickOffUser", kickOffUser: {} })).toBe(true);
        expect(isModerationEvent(undefined)).toBe(false);
    });
});
