import { TeamsCallAgent, TeamsMeetingIdLocator, CallClient } from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";

import { AzureLogger, setLogLevel } from "@azure/logger";

// Set the logger's log level
setLogLevel('verbose');

// Redirect log output to wherever desired. To console, file, buffer, REST API, etc...
AzureLogger.log = (...args: any) => {
    console.log(...args); // Redirect log output to console
};

class CallAgentManager {
    private callAgent: TeamsCallAgent|undefined;

    private async generateCallAgent() {
        const callClient = new CallClient();
        const credential = new AzureCommunicationTokenCredential('eyJhbGciOiJSUzI1NiIsImtpZCI6IjVFODQ4MjE0Qzc3MDczQUU1QzJCREU1Q0NENTQ0ODlEREYyQzRDODQiLCJ4NXQiOiJYb1NDRk1kd2M2NWNLOTVjelZSSW5kOHNUSVEiLCJ0eXAiOiJKV1QifQ.eyJza3lwZWlkIjoiYWNzOmJhYWQ5NTliLTA1MjAtNDFkZS04MTk5LTdkYzc0YzNjMDk5OV8wMDAwMDAxYy00YWE1LWE4ZTQtN2M0YS1hZDNhMGQwMDVkOTgiLCJzY3AiOjE3OTIsImNzaSI6IjE2OTkzNzcwNTQiLCJleHAiOjE2OTk0NjM0NTQsInJnbiI6ImVtZWEiLCJhY3NTY29wZSI6ImNoYXQsdm9pcCIsInJlc291cmNlSWQiOiJiYWFkOTU5Yi0wNTIwLTQxZGUtODE5OS03ZGM3NGMzYzA5OTkiLCJyZXNvdXJjZUxvY2F0aW9uIjoiZXVyb3BlIiwiaWF0IjoxNjk5Mzc3MDU0fQ.JrveFFfaHTXNg_-qzyeXlxCTDl3m297tScj8wadTSPKmwZ4osD7qroh440a0gORp-fZbznEmBQgE872BwBNaSKDhbUN9Bz0cADK50dcZ0VIp_ZHgnb-nyo_xNXRtSFWzNe-shjF95XGi7rE3ZIE_WzhFZF7BfRAHnB5FggJwacf2ZpEdYw9wjcXHn_5WigfTpJNT5TCBCbfdcp2tduOslE6xetIRK2-XxGH8HpyX_WxAhx5f2tv3eeDYPV8gYXwJ1PxFjNVxxtO-cieYoX3FzFVTFRNj-Cpfep_MZv7hErS5jAR-qOTYvbURITKh7wMotIOHGgyDbKKSmj74Gm-iMA');
        this.callAgent = await callClient.createTeamsCallAgent(credential, {displayName: 'Test User'});
    }

    /**
     * Creates a new Teams Meeting
     * @returns The MeetingLocator of the newly created meeting
     */
    public createMeeting() {
        this.generateCallAgent();

        if (!this.callAgent) {
            throw new Error('Call Agent not created');
        }

        // todo
        const teamsCall = this.callAgent.startCall([]);
        console.log(teamsCall.id, teamsCall.state, teamsCall.info, teamsCall);
    }

    /**
     * Join a Teams Meeting
     * @param meetingLocator The MeetingLocator of the meeting to join
     */
    public joinMeeting(meetingLocator: TeamsMeetingIdLocator) {
    }

    /**
     * Leave the current Teams Meeting
     */
    public leaveMeeting() {
    }
}

export const callAgentManager = new CallAgentManager();
