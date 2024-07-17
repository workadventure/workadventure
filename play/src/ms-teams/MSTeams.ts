import axios, { AxiosError, AxiosInstance } from "axios";
import { z } from "zod";
import { AvailabilityStatus, OauthRefreshToken } from "@workadventure/messages";
import { subscribe } from "svelte/internal";
import { Unsubscriber, Updater } from "svelte/store";
import { CalendarEventInterface } from "@workadventure/shared-utils";
import { ExtensionModule, ExtensionModuleOptions } from "../extension-module/extension-module";
import { TeamsActivity, TeamsAvailability } from "./MSTeamsInterface";

const MS_GRAPH_ENDPOINT = "https://graph.microsoft.com/v1.0";
const MS_ME_ENDPOINT = "/me";
const MS_ME_PRESENCE_ENDPOINT = "/me/presence";

interface MSTeamsOnlineMeeting {
    audioConferencing: {
        conferenceId: string;
        tollNumber: string;
        tollFreeNumber: string;
        dialinUrl: string;
    };
    chatInfo: {
        threadId: string;
        messageId: string;
        replyChainMessageId: string;
    };
    creationDateTime: string;
    startDateTime: string;
    endDateTime: string;
    id: string;
    joinWebUrl: string;
    subject: string;
    joinMeetingIdSettings: {
        isPasscodeRequired: boolean;
        joinMeetingId: string;
        passcode: string;
    };
    externalId: string;
    videoTeleconferenceId: string;
    allowedPresenters: string;
}

interface MSTeamsCalendarEvent {
    id: string;
    organizer: {
        emailAddress: {
            name: string;
            address: string;
        };
    };
    locations: {
        displayName: string;
    };
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    body: {
        contentType: string;
        content: string;
    };
    webLink: string;
    onlineMeeting: {
        joinUrl: string;
    };
}

class MSTeams implements ExtensionModule {
    private msAxiosClient!: AxiosInstance;
    private teamsAvailability!: TeamsAvailability;
    private clientId!: string;
    private listenToTeamsStatusInterval: NodeJS.Timer | null = null;
    private listenToWorkadventureStatus: Unsubscriber | undefined = undefined;
    private calendarEventsStoreUpdate?: (
        this: void,
        updater: Updater<Map<string, CalendarEventInterface>>
    ) => void | undefined = undefined;

    init(roomMetadata: unknown, options?: ExtensionModuleOptions) {
        const microsoftTeamsMetadata = this.getMicrosoftTeamsMetadata(roomMetadata);
        if (microsoftTeamsMetadata === undefined) {
            console.error("Microsoft teams metadata is undefined. Cancelling the initialization");
            return;
        }

        this.msAxiosClient = axios.create({
            baseURL: MS_GRAPH_ENDPOINT,
            headers: {
                Authorization: `Bearer ${microsoftTeamsMetadata.accessToken}`,
                "Content-Type": "application/json",
            },
        });
        this.msAxiosClient.interceptors.response.use(null, (error) =>
            this.refreshTokenInterceptor(error, options?.getOauthRefreshToken)
        );

        this.setMSTeamsClientId();

        if (microsoftTeamsMetadata.synchronizeStatus) {
            this.listenToTeamsStatusUpdate(options?.onExtensionModuleStatusChange);
        }

        if (options?.workadventureStatusStore) {
            this.listenToWorkadventureStatus = subscribe(
                options?.workadventureStatusStore,
                (workadventureStatus: AvailabilityStatus) => {
                    this.setStatus(workadventureStatus);
                }
            );
        }
        if (options?.calendarEventsStoreUpdate) {
            this.calendarEventsStoreUpdate = options?.calendarEventsStoreUpdate;
        }
        console.info("Microsoft teams module for WorkAdventure initialized");
    }

    private refreshTokenInterceptor(
        error: unknown,
        getOauthRefreshToken?: (tokenToRefresh: string) => Promise<OauthRefreshToken>
    ) {
        const parsedError = z
            .object({
                response: z.object({ status: z.number() }),
                config: z.object({ headers: z.object({ Authorization: z.string() }) }),
            })
            .safeParse(error);
        if (parsedError.error) {
            return Promise.reject(error);
        }
        if (parsedError.data.response.status === 401 && getOauthRefreshToken !== undefined) {
            const existingToken = parsedError.data.config.headers.Authorization.replace("Bearer ", "");
            getOauthRefreshToken(existingToken)
                .then(({ token }) => {
                    this.msAxiosClient.defaults.headers.common.Authorization = `Bearer ${token}`;
                    console.info("Microsoft teams token has been refreshed");
                })
                .catch((error) => {
                    throw error;
                });
        }
        return error;
    }

    private getMicrosoftTeamsMetadata(
        roomMetadata: unknown
    ): { accessToken: string; synchronizeStatus: boolean } | undefined {
        const parsedRoomMetadata = z
            .object({
                player: z.object({
                    accessTokens: z.array(
                        z.object({
                            token: z.string(),
                            provider: z.string(),
                        })
                    ),
                }),
                msteams: z.boolean(),
            })
            .safeParse(roomMetadata);

        if (!parsedRoomMetadata.success) {
            console.error(
                "Unable to initialize Microsoft teams module due to room metadata parsing error : ",
                parsedRoomMetadata.error
            );
            return;
        }

        //TODO access token verification
        const msTeamsAccessToken = parsedRoomMetadata.data.player.accessTokens[0]?.token;
        const synchronizeStatus = parsedRoomMetadata.data.msteams;
        if (msTeamsAccessToken === undefined) {
            console.warn("No Microsoft access token found for MSTeamsModule initialization");
            return;
        }

        return { accessToken: msTeamsAccessToken, synchronizeStatus };
    }

    listenToTeamsStatusUpdate(onTeamsStatusChange?: (workAdventureNewStatus: AvailabilityStatus) => void) {
        this.listenToTeamsStatusInterval = setInterval(() => {
            this.msAxiosClient
                .get<unknown>(MS_ME_PRESENCE_ENDPOINT)
                .then((response) => {
                    const userPresence = response.data;
                    const userPresenceResponse = z
                        .object({
                            availability: TeamsAvailability,
                            activity: TeamsActivity,
                        })
                        .safeParse(userPresence);

                    if (!userPresenceResponse.success) {
                        throw new Error("Your presence status cannot be handled by this script");
                    }

                    if (onTeamsStatusChange === undefined) {
                        console.warn(
                            "You are listening to Microsoft status changed but the onTeamsStatusChange option is not set"
                        );
                        return;
                    }

                    onTeamsStatusChange(
                        this.mapTeamsStatusToWorkAdventureStatus(userPresenceResponse.data.availability)
                    );
                    this.teamsAvailability = userPresenceResponse.data.availability;
                })
                .catch((e) => console.error("Error while getting MSTeams status", e));
        }, 10000);
    }

    setStatus(workadventureNewStatus: AvailabilityStatus) {
        const newTeamsAvailability = this.mapWorkAdventureStatusToTeamsStatus(workadventureNewStatus);
        if (newTeamsAvailability === this.teamsAvailability) {
            return;
        }

        if (this.clientId === undefined) {
            console.error("Unable to set teams status because client ID is undefined");
            return;
        }

        this.msAxiosClient
            .post(`/users/${this.clientId}/presence/setUserPreferredPresence`, {
                availability: newTeamsAvailability,
                activity: newTeamsAvailability,
            })
            .then(() => {
                console.info(`Your presence status has been set to ${newTeamsAvailability}`);
            })
            .catch((e) => console.error(e));
    }

    joinMeeting() {
        console.log("joinTeamsMeeting : Not Implemented");
    }

    destroy() {
        if (this.listenToTeamsStatusInterval) {
            clearInterval(this.listenToTeamsStatusInterval);
        }
        if (this.listenToWorkadventureStatus !== undefined) {
            this.listenToWorkadventureStatus();
        }
    }

    private setMSTeamsClientId() {
        const meResponseObject = z.object({
            id: z.string(),
        });

        this.msAxiosClient
            .get(MS_ME_ENDPOINT)
            .then((response) => {
                const meResponse = meResponseObject.safeParse(response.data);
                if (!meResponse.success) {
                    console.error("Unable to retrieve Microsoft client id", meResponse.error);
                    return;
                }
                this.clientId = meResponse.data.id;
            })
            .catch((error) => console.error("Unable to retrieve Microsoft client Id : ", error));
    }

    private mapTeamsStatusToWorkAdventureStatus(teamsStatus: TeamsAvailability): AvailabilityStatus {
        switch (teamsStatus) {
            case "Available":
                return AvailabilityStatus.ONLINE;
            case "Away":
                return AvailabilityStatus.AWAY;
            case "AvailableIdle":
                return AvailabilityStatus.ONLINE;
            case "BeRightBack":
                return AvailabilityStatus.BACK_IN_A_MOMENT;
            case "Busy":
                return AvailabilityStatus.BUSY;
            case "BusyIdle":
                return AvailabilityStatus.BUSY;
            case "DoNotDisturb":
                return AvailabilityStatus.DO_NOT_DISTURB;
            default:
                return AvailabilityStatus.DO_NOT_DISTURB;
        }
    }

    private mapWorkAdventureStatusToTeamsStatus(workAdventureStatus: AvailabilityStatus): TeamsAvailability {
        switch (workAdventureStatus) {
            case AvailabilityStatus.AWAY:
                return "Away";
            case AvailabilityStatus.BACK_IN_A_MOMENT:
                return "BeRightBack";
            case AvailabilityStatus.ONLINE:
                return "Available";
            case AvailabilityStatus.BUSY:
                return "Busy";
            case AvailabilityStatus.JITSI:
                return "Busy";
            case AvailabilityStatus.DENY_PROXIMITY_MEETING:
                return "Busy";
            case AvailabilityStatus.DO_NOT_DISTURB:
                return "DoNotDisturb";
            case AvailabilityStatus.SILENT:
                return "DoNotDisturb";
            case AvailabilityStatus.BBB:
                return "Busy";
            case AvailabilityStatus.SPEAKER:
                return "Busy";
            default:
                return "Available";
        }
    }

    // Update the calendar events
    async updateCalendarEvents(): Promise<void> {
        const myCalendarEvents = await this.getMyCalendarEvent();
        const calendarEvents = new Map<string, CalendarEventInterface>();
        for (const event of myCalendarEvents) {
            const calendarEvent: CalendarEventInterface = {
                id: event.id,
                title: event.locations.displayName,
                start: new Date(event.start.dateTime),
                end: new Date(event.end.dateTime),
                allDay: false,
                resource: event.body,
            };
            calendarEvents.set(event.id, calendarEvent);
        }
        if (this.calendarEventsStoreUpdate !== undefined) {
            this.calendarEventsStoreUpdate(() => {
                return calendarEvents;
            });
        }
    }

    private async getMyCalendarEvent(): Promise<MSTeamsCalendarEvent[]> {
        const today = new Date();
        // Create date between 00:00 and 23:59
        const startDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        const endDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        // Get all events between today 00:00 and 23:59
        return await this.msAxiosClient.get(
            `/me/calendar/events?startDateTime=${startDateTime.toISOString()}&endDateTime=${endDateTime.toISOString()}`
        );
    }

    async createOrGetMeeting(meetingId: string): Promise<MSTeamsOnlineMeeting> {
        try {
            const dateNow = new Date();
            return await this.msAxiosClient.post(`/me/onlineMeetings/createOrGet`, {
                externalId: meetingId,
                // Start date time, now
                startDateTime: dateNow.toISOString(),
                subject: "Meet Now",
            });
        } catch (e) {
            if ((e as AxiosError).response?.status === 401) {
                return await this.createOrGetMeeting(meetingId);
            }
            throw e;
        }
    }
}

export default new MSTeams();
