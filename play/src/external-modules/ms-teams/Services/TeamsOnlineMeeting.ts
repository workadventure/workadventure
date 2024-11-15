import { Axios } from "axios";
import { MSTeamsMeetingsGraphResponse } from "../index";
import { MSTeamsMeeting } from "../MapEditor/types";

export class TeamsOnlineMeetingService {
    constructor(private readonly graphClient: Axios, private readonly clientId: string) {}

    async getOnlineMeetingByJoinMeetingId(joinMeetingId: string): Promise<MSTeamsMeeting> {
        const response: MSTeamsMeetingsGraphResponse = await this.graphClient.get(
            `/users/${this.clientId}/onlineMeetings?$filter=joinMeetingIdSettings/joinMeetingId eq '${joinMeetingId}'`
        );
        const msTeamsMeetingsGraphResponse = MSTeamsMeetingsGraphResponse.safeParse(response);
        if (!msTeamsMeetingsGraphResponse.success) {
            throw new Error("Failed to parse MSTeamsMeetingsGraphResponse");
        }
        if (msTeamsMeetingsGraphResponse.data.data.value.length === 0) {
            throw new Error(`No online meeting found for joinMeetingId: ${joinMeetingId}`);
        }
        return msTeamsMeetingsGraphResponse.data.data.value[0];
    }
}
