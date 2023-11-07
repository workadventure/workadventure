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
        const credential = new AzureCommunicationTokenCredential('<yout_azure_token_credential>');
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
