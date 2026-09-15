import { describe, expect, it } from "vitest";
import type { AreaDataProperties } from "@workadventure/map-editor";
import type { AreaMapEditors } from "../../../src/front/Rules/MeetingRules";
import { hasMeetingProperty } from "../../../src/front/Rules/MeetingRules";

const jitsi = { id: "1", type: "jitsiRoomProperty" } as AreaDataProperties[number];
const teams = { id: "2", type: "extensionModule", subtype: "teams" } as AreaDataProperties[number];
const todo = { id: "3", type: "extensionModule", subtype: "todo" } as AreaDataProperties[number];
const tooltip = { id: "4", type: "tooltipPropertyData" } as AreaDataProperties[number];

describe("MeetingRules", () => {
    const modules = [{ teams: { isMeeting: true }, todo: {} }] as unknown as AreaMapEditors[];

    it("only counts core meeting properties and extension modules flagged as meetings", () => {
        expect(hasMeetingProperty([jitsi], modules)).toBe(true);
        expect(hasMeetingProperty([teams], modules)).toBe(true);
        expect(hasMeetingProperty([todo], modules)).toBe(false);
        expect(hasMeetingProperty([tooltip], modules)).toBe(false);
    });
});
