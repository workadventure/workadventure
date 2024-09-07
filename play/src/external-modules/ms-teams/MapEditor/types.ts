import { ExtensionModuleAreaProperty } from "@workadventure/map-editor";
import { z } from "zod";

export const MSTeamsMeeting = z.object({
    id: z.string(),
    subject: z.string(),
    startDateTime: z.string(),
    endDateTime: z.string(),
    joinUrl: z.string(),
    joinWebUrl: z.string(),
    joinMeetingIdSettings: z.object({
        isPasscodeRequired: z.boolean(),
        joinMeetingId: z.string(),
        passcode: z.string().optional().nullable(),
    }),
});
export type MSTeamsMeeting = z.infer<typeof MSTeamsMeeting>;

export const TeamsMeetingPropertyData = ExtensionModuleAreaProperty.extend({
    type: z.literal("extensionModule"),
    subtype: z.literal("teams"),
    data: z
        .object({
            temasOnlineMeetingId: z.string().optional(),
            msTeamsMeeting: MSTeamsMeeting.optional().nullable(),
        })
        .optional(),
});
export type TeamsMeetingPropertyData = z.infer<typeof TeamsMeetingPropertyData>;

export const TeamsAreaMapEditorData = z.object({
    teams: z.object({
        getOnlineMeetingByJoinMeetingId: z
            .function()
            .args(z.string())
            .returns(z.promise(MSTeamsMeeting.optional().nullable())),
    }),
});
export type TeamsAreaMapEditorData = z.infer<typeof TeamsAreaMapEditorData>;
