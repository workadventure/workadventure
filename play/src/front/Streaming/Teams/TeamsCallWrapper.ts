import { get } from "svelte/store";
import { RoomConnection } from "../../Connection/RoomConnection";
import { Space } from "../../Space/Space";
import { TeamsConnection } from "./TeamsConnection";
import { TeamsCall, TeamsCallAgent, CallAgent } from "@azure/communication-calling";

export class TeamsCallWrapper {
    constructor(public call: TeamsCall) {
        console.log("TeamsCallWrapper", call);
    }

    /**
     * Hang up the call
     * @param connection The connection
     * @param space The space
     * @param roomConnection The room connection
     * @returns A promise that resolves when the call is hung up
     */
    public static async join(connection: TeamsConnection, space: Space, roomConnection: RoomConnection): Promise<TeamsCallWrapper> {
        const meetingStatus = get(space.metadata).get("msTeamsMeetingStatus");
        let meetingId = get(space.metadata).get("msTeamsMeetingId");

        // If the meeting is in progress, we are awaiting for the meeting to start
        if (meetingStatus === "inprogress") {
            try {
                await this.joinWaitingRoom(connection, space, roomConnection);
            } catch (error) {
                console.error(error);
                throw new Error("Timeout waiting for the meeting to start");
            }

            meetingId = get(space.metadata).get("msTeamsMeetingId");

            if (meetingId && typeof meetingId === "string") {
                return new this(connection.callAgent.join({ meetingId }));
            }

            throw new Error("Meeting ID is not a string");
        }

        if (meetingStatus === "started") {
            if (meetingId && typeof meetingId === "string") {
                return new this(connection.callAgent.join({ meetingId }));
            }

            throw new Error("Meeting ID is not a string");
        }

        roomConnection.emitUpdateSpaceMetadata(space.name, {
            msTeamsMeetingStatus: "inprogress",
        });

        const callAgent = connection.callAgent.kind === "TeamsCallAgent"  ? connection.callAgent as TeamsCallAgent : undefined;

        if (!callAgent) {
            //(connection.callAgent as CallAgent).startCall([]);
            throw new Error('Call agent is not a TeamsCallAgent');
        }

        const call = callAgent.startCall([]);

        roomConnection.emitUpdateSpaceMetadata(space.name, {
            msTeamsMeetingStatus: "started",
            msTeamsMeetingId: call.id
        });

        return new this(call);
    }

    /**
     * Try to join the room
     * @param connection The connection
     * @param space The space
     * @param roomConnection The room connection
     * @param tries The number of tries to join the room
     * @returns A promise that resolves when the meeting starts
     */
    private static async joinWaitingRoom(connection: TeamsConnection, space: Space, roomConnection: RoomConnection, tries = 0) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const meetingStatus = get(space.metadata).get("msTeamsMeetingStatus");
                if (meetingStatus === "inprogress"){
                    if (tries > 5) {
                        reject("Timeout waiting for the meeting to start");
                    } else {
                        this.joinWaitingRoom(connection, space, roomConnection, tries + 1)
                            .then(resolve)
                            .catch(reject);
                    }
                } else {
                    resolve("Meeting started");
                }
            }, 2000);
        });
    }
}
