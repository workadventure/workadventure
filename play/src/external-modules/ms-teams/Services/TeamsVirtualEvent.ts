import { z } from "zod";
import { Axios } from "axios";

// Create zod schema for MSTeamsTownhallVirtualEventObject
const MSTeamsTownhallVirtualEventObject = z.object({
    id: z.string(),
    status: z.string(),
    displayName: z.string(),
    description: z.object({
        contentType: z.string(),
        content: z.string(),
    }),
    startDateTime: z.object({
        dateTime: z.string(),
        timeZone: z.string(),
    }),
    endDateTime: z.object({
        dateTime: z.string(),
        timeZone: z.string(),
    }),
    audience: z.string(),
    createdBy: z.object({
        application: z.any(),
        device: z.any(),
        user: z.object({
            id: z.string(),
            displayName: z.string(),
            tenantId: z.string(),
        }),
    }),
    coOrganizers: z.array(
        z.object({
            id: z.string(),
            displayName: z.string(),
            tenantId: z.string(),
        })
    ),
    settings: z.object({
        isAttendeeEmailNotificationEnabled: z.boolean(),
    }),
    invitedAttendees: z.array(z.any()),
    isInviteOnly: z.boolean(),
});
export type MSTeamsTownhallVirtualEventObject = z.infer<typeof MSTeamsTownhallVirtualEventObject>;

// Create zod schema for MSTeamsTownhallVirtualEventSessionObject
const MSTeamsTownhallVirtualEventSessionObject = z.object({
    id: z.string(),
    joinWebUrl: z.string(),
    subject: z.string(),
    videoTeleconferenceId: z.string(),
    isEntryExitAnnounced: z.boolean(),
    allowedPresenters: z.boolean(),
    allowAttendeeToEnableMic: z.boolean(),
    allowAttendeeToEnableCamera: z.boolean(),
    allowMeetingChat: z.boolean(),
    shareMeetingChatHistoryDefault: z.boolean(),
    allowTeamworkReactions: z.boolean(),
    recordAutomatically: z.boolean(),
    allowParticipantsToChangeName: z.boolean(),
    audioConferencing: z.boolean(),
    chatInfo: z.any(),
    joinInformation: z.any(),
    joinMeetingIdSettings: z.any(),
    lobbyBypassSettings: z.any(),
    watermarkProtection: z.any(),
    startDateTime: z.object({
        dateTime: z.string(),
        timeZone: z.string(),
    }),
    endDateTime: z.object({
        dateTime: z.string(),
        timeZone: z.string(),
    }),
});
export type MSTeamsTownhallVirtualEventSessionObject = z.infer<typeof MSTeamsTownhallVirtualEventSessionObject>;

// Create zod schema for MSTeamsTownhallVirtualEventResponse
const MSTeamsTownhallVirtualEventResponse = z.object({
    data: MSTeamsTownhallVirtualEventObject,
});

// Create zod schema for MSTeamsTownhallVirtualEventSessionResponse
const MSTeamsTownhallVirtualEventSessionResponse = z.object({
    data: z.object({
        "@odata.context": z.string(),
        value: z.array(MSTeamsTownhallVirtualEventSessionObject),
    }),
});

/**
 * After the annonce of the Online Meetng feature of the graph API we will deprecated by Microsoft,
 * we create this new service to use Virtual Events and Virtuel Event Townhall to creeate the online meeting
 *
 * see https://learn.microsoft.com/en-us/graph/api/resources/onlinemeeting?view=graph-rest-1.0
 */
export class TeamsVitualEventService {
    constructor(private readonly graphClient: Axios, private readonly clientId: string) {}

    // Function to create Townhall Virtual Event
    async createOrFailTownhallVirtualEvent(): Promise<MSTeamsTownhallVirtualEventObject> {
        // Date start is now
        const dateStart = new Date();
        // Date end is 1 hour after
        const dateEnd = new Date();
        dateEnd.setHours(dateStart.getHours() + 1);

        // Create a new Townhall Virtual Event
        const response = await this.graphClient.post(`/solutions/virtualEvents/townhalls`, {
            displayName: "WorkAdventure Teams Meeting",
            description: {
                contentType: "text",
                content: "WorkAdventure Teams Meeting",
            },
            startDateTime: {
                dateTime: dateStart.toISOString(),
                timeZone: "Pacific Standard Time", // Use "Pacific Standard Time" time zone with function toISOString(). Else the time zone will be UTC.
            },
            endDateTime: {
                dateTime: dateEnd.toISOString(),
                timeZone: "Pacific Standard Time", // Use "Pacific Standard Time" time zone with function toISOString(). Else the time zone will be UTC.
            },
            location: {
                displayName: "WorkAdventure Teams Meeting",
            },
            audience: "organization",
            coOrganizers: [],
            settings: {
                isAttendeeEmailNotificationEnabled: false,
            },
        });
        const msTeamsTownhallVirtualEventResponse = MSTeamsTownhallVirtualEventResponse.safeParse(response);
        if (!msTeamsTownhallVirtualEventResponse.success) {
            throw new Error("Failed to parse MSTeamsTownhallVirtualEventResponse");
        }
        return msTeamsTownhallVirtualEventResponse.data.data;
    }

    // Function to get Townhall Virtual Event from list of sessions graph API
    async getFirstOrFailTownhallVirtualEvent(
        virtuelEventTownallId: string
    ): Promise<MSTeamsTownhallVirtualEventSessionObject> {
        const response = await this.graphClient.get(
            `/solutions/virtualEvents/townhalls/${virtuelEventTownallId}/sessions`
        );
        const msTeamsTownhallVirtualEventSessionResponse =
            MSTeamsTownhallVirtualEventSessionResponse.safeParse(response);
        if (!msTeamsTownhallVirtualEventSessionResponse.success) {
            throw new Error("Failed to parse MSTeamsTownhallVirtualEventSessionResponse");
        }
        return msTeamsTownhallVirtualEventSessionResponse.data.data.value[0];
    }
}
