import axios, { AxiosError, AxiosInstance } from "axios";
import { z } from "zod";
import { AvailabilityStatus, ExternalModuleMessage, OauthRefreshToken } from "@workadventure/messages";
import { subscribe } from "svelte/internal";
import { get, Readable, Unsubscriber, Updater, writable } from "svelte/store";
import { CalendarEventInterface } from "@workadventure/shared-utils";
import { AreaData, AreaDataProperties } from "@workadventure/map-editor";
import { Observable, Subject, Subscription } from "rxjs";
import { notificationPlayingStore } from "../../front/Stores/NotificationStore";
import { ExtensionModule, ExtensionModuleOptions, RoomMetadataType } from "../../front/ExternalModule/ExtensionModule";
import { NODE_ENV } from "../../front/Enum/EnvironmentVariable";
import { OpenCoWebsiteObject } from "../../front/Chat/Utils";
import LL from "../../i18n/i18n-svelte";
import { SpaceInterface } from "../../front/Space/SpaceInterface";
import { TeamsActivity, TeamsAvailability } from "./MSTeamsInterface";

import TeamsMeetingAreaPropertyEditor from "./Components/TeamsMeetingAreaPropertyEditor.svelte";
import AddTeamsMeetingAreaPropertyButton from "./Components/AddTeamsMeetingAreaPropertyButton.svelte";
import TeamsPopupStatus from "./Components/TeamsPopupStatus.svelte";
import TeamsAvailabilityStatusInformation from "./Components/TeamsAvailabilityStatusInformation.svelte";
import TeamsActionBar from "./Components/TeamsActionBar.svelte";
import TeamsPopupMeetingNotCreated from "./Components/TeamsPopupMeetingNotCreated.svelte";
import { TodolistService } from "./Services/Todolist";
import TeamsPopupReconnect from "./Components/TeamsPopupReconnect.svelte";
import { TeamsOnlineMeetingService } from "./Services/TeamsOnlineMeeting";
import { MSTeamsMeeting, TeamsMeetingPropertyData } from "./MapEditor/types";
import { ExternalModuleEvent } from "../../front/Api/Events/ExternalModuleEvent";
import { isExternalMsTeamsModuleEvent } from "./Messages/type";
import { iframeListener } from "../../front/Api/IframeListener";

const MS_GRAPH_ENDPOINT_V1 = "https://graph.microsoft.com/v1.0";
const MS_GRAPH_ENDPOINT_BETA = "https://graph.microsoft.com/beta";
const MS_ME_ENDPOINT = "/me";
const MS_ME_PRESENCE_ENDPOINT = "/presence";

enum MSGraphMessageEventSource {
    MicrosoftGraphPresence = "#Microsoft.Graph.presence",
    MicrosoftGraphEvent = "#Microsoft.Graph.Event",
    MicrosoftGraphSubscription = "#Microsoft.Graph.subscription",
    MicrosoftTodoTask = "#Microsoft.Graph.todoTask",
}

export interface MSTeamsExtensionModule extends ExtensionModule {
    checkModuleSynschronisation: () => void;
    statusStore: Readable<TeamsModuleStatus>;
    meetingSynchronised: boolean;
    presenceSynchronised: boolean;
    openPopUpModuleStatus: () => void;
    closePopUpModuleStatus: () => void;
    closePopUpMeetingNotCreated: () => void;
    openPopUpModuleReconnect: () => void;
    closePopUpModuleReconnect: () => void;
    dontShowAgainPopUpModuleReconnect: () => void;
    reconnectToTeams: () => void;
    isGuest: boolean;
}

export enum TeamsModuleStatus {
    ONLINE = "online",
    WARNING = "warning",
    SYNC = "sync",
    OFFLINE = "offline",
    NONE = "none",
}

export const MSTeamsMeetings = z.object({
    value: z.array(MSTeamsMeeting),
});
export type MSTeamsMeetings = z.infer<typeof MSTeamsMeetings>;

export const MSTeamsMeetingsGraphResponse = z.object({
    data: MSTeamsMeetings,
});
export type MSTeamsMeetingsGraphResponse = z.infer<typeof MSTeamsMeetingsGraphResponse>;

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
    subject: string;
    bodyPreview: string;
}

export interface MSGraphSubscriptionResponse {
    data: MSGraphSubscription;
}
export interface MSGraphSubscription {
    id: string;
    changeType: string;
    clientState: string;
    expirationDateTime: string;
    resource: string;
    applicationId: string;
    notificationUrl: string;
    lifecycleNotificationUrl: string;
    creatorId: string;
}

class MSTeams implements MSTeamsExtensionModule {
    public id = "ms-teams";

    private msAxiosClientV1!: AxiosInstance;
    private msAxiosClientBeta!: AxiosInstance;
    private teamsAvailability!: TeamsAvailability;
    private clientId!: string;
    private listenToWorkadventureStatus: Unsubscriber | undefined = undefined;

    private calendarEventsStoreUpdate?: (
        this: void,
        updater: Updater<Map<string, CalendarEventInterface>>
    ) => void | undefined = undefined;
    private userAccessToken!: string;
    private MSUserAccessToken: { token: string; provider: string } | undefined;
    private adminUrl?: string;
    private roomId!: string;
    private roomMetadata!: RoomMetadataType;

    private checkModuleSynschronisationInterval: NodeJS.Timer | undefined = undefined;
    private teamsSynchronisationStore = writable<TeamsModuleStatus>(TeamsModuleStatus.SYNC);

    private openCoWebSite?: (
        openCoWebsiteObject: OpenCoWebsiteObject,
        source: MessageEventSource | null
    ) => Promise<{ id: string }>;
    private closeCoWebSite?: (id: string) => unknown;
    private cowebsiteOpenedId?: string;
    private moduleOptions!: ExtensionModuleOptions;

    private spaces: Map<string, SpaceInterface> = new Map<string, SpaceInterface>();
    private watchsSpaceMetadataSubscribe: Map<string, Subscription> = new Map<string, Subscription>();
    private onlineTeamsMeetingsCreated: Set<string> = new Set<string>();

    private teamsOnLineMeetingService?: TeamsOnlineMeetingService;
    private todoList?: TodolistService;

    private initTimeOut: NodeJS.Timeout | undefined = undefined;

    init(roomMetadata: RoomMetadataType, options: ExtensionModuleOptions) {
        this.roomMetadata = roomMetadata;
        this.moduleOptions = options;
        this.userAccessToken = this.moduleOptions.userAccessToken;
        this.adminUrl = this.moduleOptions.adminUrl;
        this.roomId = this.moduleOptions.roomId;

        this.openCoWebSite = this.moduleOptions.openCoWebSite;
        this.closeCoWebSite = this.moduleOptions.closeCoWebsite;

        this.teamsSynchronisationStore.set(TeamsModuleStatus.SYNC);

        this.MSUserAccessToken = roomMetadata?.player?.accessTokens ? roomMetadata.player.accessTokens[0] : undefined;

        if (this.MSUserAccessToken === undefined || roomMetadata.player?.accessTokens?.length === 0) {
            console.error("Microsoft teams metadata is undefined. Cancelling the initialization");
            if (roomMetadata.msTeamsSettings.communication) {
                this.teamsSynchronisationStore.set(TeamsModuleStatus.NONE);
                // Initialize svelte component because the user has not access but the world has Teams Communication Synchronisation enabled
                this.initSvelteComponent();
            }
            return;
        }

        this.msAxiosClientV1 = axios.create({
            baseURL: MS_GRAPH_ENDPOINT_V1,
            headers: {
                Authorization: `Bearer ${this.MSUserAccessToken.token}`,
                "Content-Type": "application/json",
            },
        });
        this.msAxiosClientV1.interceptors.response.use(null, (error) =>
            this.refreshTokenInterceptor(error, this.moduleOptions.getOauthRefreshToken)
        );

        this.msAxiosClientBeta = axios.create({
            baseURL: MS_GRAPH_ENDPOINT_BETA,
            headers: {
                Authorization: `Bearer ${this.MSUserAccessToken.token}`,
                "Content-Type": "application/json",
            },
        });
        this.msAxiosClientBeta.interceptors.response.use(null, (error) =>
            this.refreshTokenInterceptor(error, this.moduleOptions.getOauthRefreshToken)
        );

        // Get the client ID
        this.setMSTeamsClientId()
            .then(() => {
                // Listen to the status change
                if (roomMetadata.msTeamsSettings.status) {
                    this.listenToTeamsStatusUpdate(this.moduleOptions.onExtensionModuleStatusChange).catch((e) =>
                        console.error("Error while listening Teams status update", e)
                    );
                    if (
                        this.moduleOptions.workadventureStatusStore &&
                        roomMetadata.msTeamsSettings.statusWorkAdventureToTeams
                    ) {
                        this.listenToWorkadventureStatus = subscribe(
                            this.moduleOptions.workadventureStatusStore,
                            (workadventureStatus: AvailabilityStatus) => {
                                this.setStatusToTeams(workadventureStatus)?.catch((e) =>
                                    console.error("Error while setting Teams status", e)
                                );
                            }
                        );
                    }
                }

                // Update the calendar events
                if (roomMetadata.msTeamsSettings.calendar && this.moduleOptions.calendarEventsStoreUpdate) {
                    this.calendarEventsStoreUpdate = this.moduleOptions.calendarEventsStoreUpdate;
                    this.updateCalendarEvents().catch((e) => console.error("Error while updating calendar events", e));
                }

                // Initialize Todo List synchronization
                if (roomMetadata.msTeamsSettings.todoList && this.moduleOptions.todoListStoreUpdate) {
                    this.todoList = new TodolistService(
                        this.msAxiosClientV1,
                        this.userAccessToken,
                        this.roomId,
                        this.moduleOptions.todoListStoreUpdate,
                        this.adminUrl
                    );
                }

                // Initialize Online Meeting synchronization
                if (roomMetadata.msTeamsSettings.communication) {
                    this.teamsOnLineMeetingService = new TeamsOnlineMeetingService(this.msAxiosClientV1, this.clientId);
                }

                // Initialize the subscription
                if (
                    this.adminUrl != undefined &&
                    this.adminUrl.indexOf("localhost") === -1 &&
                    NODE_ENV === "production"
                ) {
                    this.initSubscription().catch((e) => console.error("Error while initializing subscription", e));
                } else {
                    // In development mode, we can't use the webhook because the server is not accessible from the internet
                    // So we replace the webhook by sending a call API every 10 minutes
                    if (this.roomMetadata.msTeamsSettings.calendar)
                        setInterval(() => {
                            this.updateCalendarEvents().catch((e) =>
                                console.error("Error while updating calendar events", e)
                            );
                        }, 1000 * 60 * 10);

                    // So we replace the webhook by sending a call API every 10 seconds
                    if (
                        this.roomMetadata.msTeamsSettings.status &&
                        this.roomMetadata.msTeamsSettings.statusTeamsToWorkAdventure
                    )
                        setInterval(() => {
                            this.listenToTeamsStatusUpdate(this.moduleOptions.onExtensionModuleStatusChange).catch(
                                (e) => console.error("Error while listening Teams status update", e)
                            );
                        }, 1000 * 10);

                    // So we replace the webhook by sending a call API every 10 minutes for todo list
                    if (this.roomMetadata.msTeamsSettings.todoList) {
                        setInterval(() => {
                            this.todoList
                                ?.getTodolist()
                                .catch((e) => console.error("Error while updating todo list", e));
                        }, 1000 * 60 * 10);
                    }
                }
            })
            .catch((e) => {
                console.warn("Error while initializing Microsoft Teams module", e);
                if (this.clientId == undefined) {
                    this.destroy();
                    // try to init the module again in one minutes
                    if (this.initTimeOut !== undefined) clearTimeout(this.initTimeOut);
                    this.initTimeOut = setTimeout(() => {
                        console.info("New tentative to init Microsoft Teams module");
                        return this.init(roomMetadata, options);
                    }, 1000 * 60);
                }
            });

        if (this.moduleOptions.externalModuleMessage) {
            // The externalModuleMessage is completed in the RoomConnection. No need to unsubscribe.
            //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
            this.moduleOptions.externalModuleMessage.subscribe((externalModuleMessage: ExternalModuleMessage) => {
                console.info("Message received from external module", externalModuleMessage);
                const type = externalModuleMessage.message["@odata.type"];
                switch (type.toLowerCase()) {
                    case MSGraphMessageEventSource.MicrosoftGraphPresence.toLocaleLowerCase():
                        if (!this.moduleOptions.onExtensionModuleStatusChange) break;
                        /*
                            ⚠️
                            Don't trust event pushed by Microsoft Graph API
                            The event could be received after the user has changed his status and create confusion for the user

                        // Update the teams status of this module and do not call API to set presence
                        this.teamsAvailability = externalModuleMessage.message.availability;

                        // Update the workadventure status
                        this.moduleOptions.onExtensionModuleStatusChange(
                            this.mapTeamsStatusToWorkAdventureStatus(externalModuleMessage.message.availability)
                        );
                        */

                        // CHANGE ME: with th new API for presence, try to make more performance by calling the API only when the user change his status
                        // Get presence status from Microsoft Graph API
                        this.listenToTeamsStatusUpdate(this.moduleOptions.onExtensionModuleStatusChange).catch((e) =>
                            console.error("Error while listening Teams status update", e)
                        );

                        break;
                    case MSGraphMessageEventSource.MicrosoftGraphEvent.toLocaleLowerCase():
                        this.updateCalendarEvents().catch((e) =>
                            console.error("Error while updating calendar events", e)
                        );
                        break;
                    case MSGraphMessageEventSource.MicrosoftGraphSubscription.toLocaleLowerCase():
                        this.checkModuleSynschronisation().catch((e) =>
                            console.error("Error while reauthorizing subscriptions", e)
                        );
                        break;
                    case MSGraphMessageEventSource.MicrosoftTodoTask.toLocaleLowerCase():
                        this.todoList?.getTodolist().catch((e) => console.error("Error while updating todo list", e));
                        break;
                    default:
                        console.warn("Unknown message type", type);
                        break;
                }
                return externalModuleMessage;
            });
        }

        this.teamsSynchronisationStore.set(TeamsModuleStatus.ONLINE);
        // Initialize svelte component for Teams Synchronisation
        this.initSvelteComponent();

        console.info("Microsoft teams module for WorkAdventure initialized");
    }

    private initSvelteComponent() {
        const externalSvelteComponent = get(this.moduleOptions.externalSvelteComponent);
        if (externalSvelteComponent.addAvailibilityStatusComponent) {
            externalSvelteComponent.addAvailibilityStatusComponent(
                "ms-teams",
                this,
                TeamsAvailabilityStatusInformation
            );
        }
        if (externalSvelteComponent.addActionBarComponent) {
            externalSvelteComponent.addActionBarComponent("ms-teams", this, TeamsActionBar);
        }
    }

    // variable to save the number of tentatives to refresh the token
    private tentatives = 0;
    private popUpModuleReconnect = false;
    private askDoNotShowAgainPopUpModuleReconnect = false;
    private promiseReconnectToTeams: Promise<void> | undefined = undefined;
    private refreshTokenInterceptor(
        error: unknown,
        getOauthRefreshToken?: (tokenToRefresh: string) => Promise<OauthRefreshToken>
    ) {
        // In the case where the client ID is undefined, we can't refresh the token
        // The token is wrong and we need to reconnect to Teams
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
            // If the token is already being refreshed, we don't need to do it again
            if (this.promiseReconnectToTeams || !this.MSUserAccessToken) {
                return;
            }
            this.promiseReconnectToTeams = getOauthRefreshToken(this.MSUserAccessToken.token)
                .then(({ token }) => {
                    if (this.MSUserAccessToken) this.MSUserAccessToken.token = token;

                    this.msAxiosClientV1.defaults.headers.common.Authorization = `Bearer ${this.MSUserAccessToken?.token}`;
                    this.msAxiosClientBeta.defaults.headers.common.Authorization = `Bearer ${this.MSUserAccessToken?.token}`;
                    console.info("Microsoft teams token has been refreshed");
                    this.tentatives = 0;
                    this.promiseReconnectToTeams = undefined;
                })
                .catch((error) => {
                    // Count tentative to reconnect to Teams if it's impossible to refresh the token
                    this.tentatives++;
                    this.promiseReconnectToTeams = undefined;
                    // If the token can't be refreshed, we try 3 times. Propose to the user to reconnect if it doesn't work
                    if (this.tentatives > 10) {
                        console.error("Error while refreshing token", error);
                        if (this.moduleOptions.logoutCallback && this.popUpModuleReconnect === false) {
                            this.openPopUpModuleReconnect();
                            return;
                        }
                    }
                    throw error;
                });
        }
        return error;
    }

    listenToTeamsStatusUpdate(onTeamsStatusChange?: (workAdventureNewStatus: AvailabilityStatus) => void) {
        if (this.clientId == undefined)
            throw new Error("Unable to listen to teams status because client ID is undefined");
        return this.msAxiosClientV1
            .get<unknown>(`/users/${this.clientId}${MS_ME_PRESENCE_ENDPOINT}`)
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

                this.teamsAvailability = userPresenceResponse.data.availability;
                onTeamsStatusChange(this.mapTeamsStatusToWorkAdventureStatus(userPresenceResponse.data.availability));
            })
            .catch((e) => console.error("Error while getting MSTeams status", e));
    }

    setStatusToTeams(workadventureNewStatus: AvailabilityStatus) {
        const newTeamsAvailability = this.mapWorkAdventureStatusToTeamsStatus(workadventureNewStatus);
        if (newTeamsAvailability === this.teamsAvailability) {
            return;
        }

        if (this.clientId === undefined) {
            console.error("Unable to set teams status because client ID is undefined");
            return;
        }

        return this.msAxiosClientV1
            .post(this.getUrlForSettingUserPresence(), {
                availability: newTeamsAvailability,
                activity: newTeamsAvailability,
            })
            .then(() => {
                console.info(`Your presence status has been set to ${newTeamsAvailability}`);
                this.teamsAvailability = newTeamsAvailability;
            })
            .catch((e) => console.error(e));
    }

    private getUrlForSettingUserPresence() {
        if (this.clientId == undefined) throw new Error("Unable to set teams status because client ID is undefined");
        return `/users/${this.clientId}/presence/setUserPreferredPresence`;
    }

    joinMeeting() {
        console.info("joinTeamsMeeting : Not Implemented");
    }

    destroy() {
        if (this.listenToWorkadventureStatus !== undefined) this.listenToWorkadventureStatus();
        this.destroySubscription().catch((e) => console.error("Error while destroying subscription", e));
    }

    private setMSTeamsClientId() {
        const meResponseObject = z.object({
            id: z.string(),
        });

        return this.msAxiosClientV1
            .get(MS_ME_ENDPOINT)
            .then((response) => {
                const meResponse = meResponseObject.safeParse(response.data);
                if (!meResponse.success) {
                    throw new Error("Unable to retrieve Microsoft client id");
                }
                this.clientId = meResponse.data.id;
            })
            .catch((error) => {
                console.error("Unable to retrieve Microsoft client Id : ", error);
                // try to refresh the token
                this.refreshTokenInterceptor(error, this.moduleOptions.getOauthRefreshToken);
                throw error;
            });
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
    private async updateCalendarEvents(): Promise<void> {
        try {
            const myCalendarEvents = await this.getMyCalendarEvent();
            const calendarEvents = [];
            for (const event of myCalendarEvents) {
                const calendarEvent: CalendarEventInterface = {
                    id: event.id,
                    title: event.subject,
                    description: event.bodyPreview,
                    start: new Date(event.start.dateTime),
                    end: new Date(event.end.dateTime),
                    allDay: false,
                    resource: {
                        body: event.body,
                        onlineMeeting: event.onlineMeeting,
                    },
                };
                calendarEvents.push(calendarEvent);
            }

            // Sort the calendar events by start date
            calendarEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

            // Convert the calendar to map
            const sortedCalendarEvents = new Map<string, CalendarEventInterface>();
            for (const event of calendarEvents) {
                sortedCalendarEvents.set(event.id, event);
            }

            // Update the calendar events store
            if (this.calendarEventsStoreUpdate !== undefined) {
                this.calendarEventsStoreUpdate(() => {
                    return sortedCalendarEvents;
                });
            }
        } catch (e) {
            console.error("Error while updating calendar events", e);
            // TODO show error message
        }
    }

    private async getMyCalendarEvent(): Promise<MSTeamsCalendarEvent[]> {
        const today = new Date();
        // Create date between 00:00 and 23:59
        const startDateTime = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            today.getHours(),
            0,
            0,
            0
        );
        const endDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        // Get all events between today 00:00 and 23:59
        try {
            const calendarEventUrl = `/me/calendar/calendarView?$select=subject,body,bodyPreview,organizer,attendees,start,end,location,weblink,onlineMeeting&startDateTime=${startDateTime.toISOString()}&endDateTime=${endDateTime.toISOString()}`;
            const mSTeamsCalendarEventResponse = await this.msAxiosClientV1.get(calendarEventUrl);
            return mSTeamsCalendarEventResponse.data.value;
        } catch (e) {
            if ((e as AxiosError).response?.status === 401) {
                return await this.getMyCalendarEvent();
            }
            throw e;
        }
    }

    async createOrGetMeeting(meetingId: string): Promise<MSTeamsMeeting> {
        try {
            const dateNow = new Date();
            const onlineMeetingUrl = "/me/onlineMeetings/createOrGet";
            const response = await this.msAxiosClientV1.post(onlineMeetingUrl, {
                externalId: meetingId,
                // Start date time, now
                startDateTime: dateNow.toISOString(),
                subject: "Meet Now",
            });
            return response.data;
        } catch (e) {
            if ((e as AxiosError).response?.status === 401) {
                return await this.createOrGetMeeting(meetingId);
            }
            throw e;
        }
    }

    private async initSubscription(): Promise<void> {
        console.info("Init module synchronization check");

        // All 10 minutes, check if the subscriptions are expired
        let checkModuleSynchronisationIntervalMinutes = 10 * 60 * 1000;

        // Initialize the subscription for presence
        if (this.roomMetadata.msTeamsSettings.status && this.roomMetadata.msTeamsSettings.statusTeamsToWorkAdventure) {
            try {
                const presenceSubscriptionResponse = await this.createOrGetPresenceSubscription();

                // Define the last time to renew the subscription
                const expirationDateTime = new Date(presenceSubscriptionResponse.data.expirationDateTime);
                // Calculsate the time to renew the subscription
                // We renew the subscription 2 seconds after the expiration date
                const timeToRenewSubscription = expirationDateTime.getTime() - new Date().getTime() + 1000 * 2;
                if (
                    timeToRenewSubscription > 0 &&
                    timeToRenewSubscription < checkModuleSynchronisationIntervalMinutes
                ) {
                    checkModuleSynchronisationIntervalMinutes = timeToRenewSubscription;
                }
            } catch (e) {
                console.error("Error while creating or getting presence subscription", e);
                // If there is an error, the interval will be set to 1 minutes and the synchronization will be retried
                checkModuleSynchronisationIntervalMinutes = 1 * 60 * 1000;
            }
        }

        // Initialize the subscription for calendar
        if (this.roomMetadata.msTeamsSettings.calendar) {
            try {
                const calendarSubscriptionResponse = await this.createOrGetCalendarSubscription();

                // Define the last time to renew the subscription
                const expirationDateTime = new Date(calendarSubscriptionResponse.data.expirationDateTime);
                // Calculsate the time to renew the subscription
                // We renew the subscription 2 seconds after the expiration date
                const timeToRenewSubscription = expirationDateTime.getTime() - new Date().getTime() + 1000 * 2;
                if (
                    timeToRenewSubscription > 0 &&
                    timeToRenewSubscription < checkModuleSynchronisationIntervalMinutes
                ) {
                    checkModuleSynchronisationIntervalMinutes = timeToRenewSubscription;
                }
            } catch (e) {
                console.error("Error while creating or getting calendar subscription", e);
                // If there is an error, the interval will be set to 1 minutes and the synchronization will be retried
                checkModuleSynchronisationIntervalMinutes = 1 * 60 * 1000;
            }
        }

        if (this.roomMetadata.msTeamsSettings.todoList) {
            try {
                const todoListSubscriptionResponse = await this.todoList?.createOrGetTodoListSubscription();

                if (todoListSubscriptionResponse == undefined)
                    throw new Error("Error while creating or getting todo list subscription");
                // Define the last time to renew the subscription for each subscription of the todo list
                for (const todoListSubscription of todoListSubscriptionResponse) {
                    const expirationDateTime = new Date(todoListSubscription.data.expirationDateTime);
                    // Calculsate the time to renew the subscription
                    // We renew the subscription 2 seconds after the expiration date
                    const timeToRenewSubscription = expirationDateTime.getTime() - new Date().getTime() + 1000 * 2;
                    if (
                        timeToRenewSubscription > 0 &&
                        timeToRenewSubscription < checkModuleSynchronisationIntervalMinutes
                    ) {
                        checkModuleSynchronisationIntervalMinutes = timeToRenewSubscription;
                    }
                }
            } catch (e) {
                console.error("Error while creating or getting todo list subscription", e);
                // If there is an error, the interval will be set to 1 minutes and the synchronization will be retried
                checkModuleSynchronisationIntervalMinutes = 1 * 60 * 1000;
            }
        }

        if (this.checkModuleSynschronisationInterval !== undefined)
            clearTimeout(this.checkModuleSynschronisationInterval);
        this.checkModuleSynschronisationInterval = setTimeout(() => {
            console.info("Check module synchronization");
            this.checkModuleSynschronisation().catch((e) =>
                console.error("Error while reauthorizing subscriptions", e)
            );
        }, checkModuleSynchronisationIntervalMinutes);
    }

    // Check module synchronization
    // If there is an error, the interval will be set to 1 minutes and the synchronization will be retried
    async checkModuleSynschronisation(): Promise<void> {
        console.info("Check module synchronization");
        if (!this.adminUrl) {
            console.info(
                "Admin URL is not defined. Subscription to Graph API webhook is not possible!",
                new Date().toLocaleString()
            );
            return;
        }
        this.teamsSynchronisationStore.set(TeamsModuleStatus.SYNC);
        console.info("Check module synchronization", new Date().toLocaleString());

        // Get all subscription
        const subscriptions = await this.msAxiosClientBeta.get(`/subscriptions/`);

        try {
            if (subscriptions.status < 200 || subscriptions.status >= 300)
                throw new Error("Error while getting subscriptions");
            // If there is no subscription, reinitialize the subscription
            if (subscriptions.data && subscriptions.data.value && subscriptions.data.value.length < 2) {
                try {
                    await this.initSubscription();
                    this.teamsSynchronisationStore.set(TeamsModuleStatus.ONLINE);
                } catch (e) {
                    console.error("Error while reinitializing subscriptions", e);
                }
            } else {
                // Indicate to the user that the synchronization is working
                this.teamsSynchronisationStore.set(TeamsModuleStatus.ONLINE);
            }
        } catch (e) {
            this.teamsSynchronisationStore.set(TeamsModuleStatus.WARNING);
            console.error("Error while reauthorizing subscriptions", e);
            // If there is an error, delete subscription and try to create a new twice
            const promisesDeleteSubscription = [];
            if (subscriptions.data && subscriptions.data.value) {
                for (const subscription of subscriptions.data.value) {
                    if (new Date(subscription.expirationDateTime) < new Date()) {
                        if (subscription.resource === `/communications/presences/${this.clientId}`) {
                            promisesDeleteSubscription.push(this.deletePresenceSubscription(subscription.id));
                        } else if (subscription.resource === `/me/events`) {
                            promisesDeleteSubscription.push(this.deleteCalendarSubscription(subscription.id));
                        }
                    }
                }
            }
            try {
                await Promise.all(promisesDeleteSubscription);
            } catch (e) {
                console.error("Error while deleting subscriptions", e);
            }

            // Reinitialize the subscription
            try {
                await this.initSubscription();
            } catch (e) {
                // If there is an error, retry in 1 minutes
                console.error("Error while reinitializing subscriptions", e);
            }
        }
    }

    // Destroy all subscriptions
    private async destroySubscription(): Promise<void> {
        // Get all subscription
        const subscriptions = await this.msAxiosClientBeta.get(`/subscriptions/`);
        const promisesDeleteSubscription = [];
        for (const subscription of subscriptions.data.value) {
            if (subscription.resource === `/communications/presences/${this.clientId}`) {
                promisesDeleteSubscription.push(this.deletePresenceSubscription(subscription.id));
            } else if (subscription.resource === `/me/events`) {
                promisesDeleteSubscription.push(this.deleteCalendarSubscription(subscription.id));
            }
        }
        Promise.all(promisesDeleteSubscription).catch((e) => console.error("Error while deleting subscriptions", e));
    }

    // Create subscription to listen changes
    private async createOrGetPresenceSubscription(): Promise<MSGraphSubscriptionResponse> {
        // Check if the subscription already exists
        const subscriptions = await this.msAxiosClientV1.get(`/subscriptions`);
        if (subscriptions.data.value.length > 0) {
            const presenceSubscription: MSGraphSubscription = subscriptions.data.value.find(
                (subscription: MSGraphSubscription) =>
                    subscription.resource === `/communications/presences/${this.clientId}`
            );
            // Check if the subscription is expired
            // If subscription is not expired, return the subscription
            if (presenceSubscription != undefined && new Date(presenceSubscription.expirationDateTime) > new Date()) {
                return { data: presenceSubscription };
            }
        }

        // Expiration date is 60 minutes, check the graph documentation for more information
        // https://docs.microsoft.com/en-us/graph/api/subscription-post-subscriptions?view=graph-rest-1.0
        const expirationDateTime = new Date();
        expirationDateTime.setMinutes(expirationDateTime.getMinutes() + 60);

        return await this.msAxiosClientV1.post(`/subscriptions`, {
            changeType: "updated",
            notificationUrl: `${this.adminUrl}/api/webhook/msgraph/notificationUrl/${this.userAccessToken}`,
            lifecycleNotificationUrl: `${this.adminUrl}/api/webhook/msgraph/notificationUrl/${this.userAccessToken}`,
            resource: `/communications/presences/${this.clientId}`,
            expirationDateTime,
            clientState: `${this.roomId}`,
        });
    }

    // Create subscription to listen changes
    private async createOrGetCalendarSubscription(): Promise<MSGraphSubscriptionResponse> {
        // Check if the subscription already exists
        const subscriptions = await this.msAxiosClientBeta.get(`/subscriptions`);
        if (subscriptions.data.value.length > 0) {
            const calendarSubscription: MSGraphSubscription = subscriptions.data.value.find(
                (subscription: MSGraphSubscription) => subscription.resource === `/me/events`
            );
            // Check if the subscription is expired
            if (calendarSubscription != undefined && new Date(calendarSubscription.expirationDateTime) > new Date()) {
                return { data: calendarSubscription };
            }
        }

        // Expiration date is 3 days for online meeting, check the graph documentation for more information
        // https://docs.microsoft.com/en-us/graph/api/subscription-post-subscriptions?view=graph-rest-1.0
        const expirationDateTime = new Date();
        expirationDateTime.setMinutes(expirationDateTime.getMinutes() + 4230);

        return await this.msAxiosClientBeta.post(`/subscriptions`, {
            changeType: "created,updated,deleted",
            notificationUrl: `${this.adminUrl}/api/webhook/msgraph/notificationUrl/${this.userAccessToken}`,
            lifecycleNotificationUrl: `${this.adminUrl}/api/webhook/msgraph/notificationUrl/${this.userAccessToken}`,
            resource: `/me/events`,
            expirationDateTime,
            clientState: `${this.roomId}`,
        });
    }

    private async deletePresenceSubscription(subscriptionId: string): Promise<void> {
        await this.msAxiosClientV1.delete(`/subscriptions/${subscriptionId}`);
    }

    private async deleteCalendarSubscription(subscriptionId: string): Promise<void> {
        await this.msAxiosClientBeta.delete(`/subscriptions/${subscriptionId}`);
    }

    /** Reauthorize doesn't work for presence with MSGraph API */
    /*private async reauthorizePresenceSubscription(subscriptionId: string): Promise<void> {
        // Expiration date is 60 minutes, check the graph documentation for more information
        // https://docs.microsoft.com/en-us/graph/api/subscription-post-subscriptions?view=graph-rest-1.0
        const expirationDateTime = new Date();
        expirationDateTime.setMinutes(expirationDateTime.getMinutes() + 60);
        await this.msAxiosClientBeta.post(`/subscriptions/${subscriptionId}/reauthorize`);
        await this.msAxiosClientBeta.patch(`/subscriptions/${subscriptionId}`, {
            expirationDateTime,
        });
    }*/

    /** Reauthorize doesn't work for calendar with MSGraph API */
    /*private async reauthorizeCalendarSubscription(subscriptionId: string): Promise<void> {
        // Expiration date is 3 days for online meeting, check the graph documentation for more information
        // https://docs.microsoft.com/en-us/graph/api/subscription-post-subscriptions?view=graph-rest-1.0
        const expirationDateTime = new Date();
        expirationDateTime.setDate(expirationDateTime.getDate() + 3);

        await this.msAxiosClientV1.post(`/subscriptions/${subscriptionId}/reauthorize`);
        await this.msAxiosClientV1.patch(`/subscriptions/${subscriptionId}`, {
            expirationDateTime,
        });
    }*/

    areaMapEditor() {
        if (!this.roomMetadata.msTeamsSettings.communication) return;
        return {
            teams: {
                AreaPropertyEditor: TeamsMeetingAreaPropertyEditor,
                AddAreaPropertyButton: AddTeamsMeetingAreaPropertyButton,
                handleAreaPropertyOnEnter: this.handleAreaPropertyOnEnter.bind(this),
                handleAreaPropertyOnLeave: this.handleAreaPropertyOnLeave.bind(this),
                shouldDisplayButton: (areaDataProperties: AreaDataProperties) =>
                    !areaDataProperties.find(
                        (property) => property.type === "extensionModule" && property.subtype === "teams"
                    ),
                getOnlineMeetingByJoinMeetingId: this.getOnlineMeetingByJoinMeetingId.bind(this),
            },
        };
    }

    private handleAreaPropertyOnEnter(area: AreaData) {
        console.debug("Enter extension module area");

        // Check if the Teams property is defined
        const teamsAreaProperty = area.properties?.find(
            (property) => property.type === "extensionModule" && property.subtype === "teams"
        ) as TeamsMeetingPropertyData | undefined;
        if (teamsAreaProperty === undefined) {
            console.warn("Teams property is not defined, unable to join space, create or get meeting and share it!");
            notificationPlayingStore.removeNotificationById(area.id);
            notificationPlayingStore.playNotification(
                get(LL).externalModule.teams.unableJoinMeeting(),
                "business.svg",
                area.id
            );
            return;
        }

        // Check if the property is well formatted and have join meeting id
        if (teamsAreaProperty.data && teamsAreaProperty.data.msTeamsMeeting) {
            console.info(
                "Joining Teams meeting was defined in the area property",
                teamsAreaProperty.data.msTeamsMeeting.joinMeetingIdSettings.joinMeetingId
            );
            notificationPlayingStore.removeNotificationById(area.id);
            notificationPlayingStore.playNotification(
                get(LL).externalModule.teams.openingMeeting(),
                "business.svg",
                area.id
            );
            this.openCowebsiteTeamsMeeting(teamsAreaProperty.data.msTeamsMeeting)
                .then(() => {
                    this.onlineTeamsMeetingsCreated.add(area.id);
                })
                .catch((e) => {
                    console.error("Error while opening cowebsite Teams meeting", e);
                    this.closeCoWebSiteTeamsMeeting();
                    throw e;
                });
            return;
        }

        if (!this.moduleOptions.spaceRegistry) {
            console.warn("SpaceRegistry is not defined, unable to join space, create or get meeting and share it!");
            notificationPlayingStore.removeNotificationById(area.id);
            notificationPlayingStore.playNotification(
                get(LL).externalModule.teams.unableJoinMeeting(),
                "business.svg",
                area.id
            );
            return;
        }
        // join space meeting
        console.debug(
            "SpaceRegistry is defined, join space, create or get meeting and share it!",
            `msteams-${area.id}`
        );
        let _space = undefined;
        try {
            _space = this.moduleOptions.spaceRegistry.get(`msteams-${area.id}`);
        } catch (e) {
            console.info("Error while joining space", e);
        }
        const space = _space ? _space : this.moduleOptions.spaceRegistry.joinSpace(`msteams-${area.id}`);

        notificationPlayingStore.removeNotificationById(area.id);
        notificationPlayingStore.playNotification(
            get(LL).externalModule.teams.openingMeeting(),
            "business.svg",
            area.id
        );

        const watchSpaceMetadataSubscribe = space.watchSpaceMetadata().subscribe((value) => {
            // Use time out to avoid multiple meeting creation
            console.log(
                "this.onlineTeamsMeetingsCreated.has(area.id)",
                area.id,
                this.onlineTeamsMeetingsCreated.has(area.id)
            );
            if (this.onlineTeamsMeetingsCreated.has(area.id)) return;

            // If the space has a meeting, open the meeting and clear the timeout to create a new meeting
            const parseMSTeamsMeeting = MSTeamsMeeting.safeParse(JSON.parse(value.metadata));
            if (parseMSTeamsMeeting.success) {
                notificationPlayingStore.removeNotificationById(area.id);
                notificationPlayingStore.playNotification(
                    get(LL).externalModule.teams.openingMeeting(),
                    "business.svg",
                    area.id
                );

                this.onlineTeamsMeetingsCreated.add(area.id);
                this.openCowebsiteTeamsMeeting(parseMSTeamsMeeting.data)
                    .then(() => {
                        // Remove popup component
                        this.closePopUpMeetingNotCreated();
                    })
                    .catch((e) => {
                        console.error("Error while opening cowebsite Teams meeting", e);
                        notificationPlayingStore.removeNotificationById(area.id);
                        notificationPlayingStore.playNotification(
                            get(LL).externalModule.teams.unableJoinMeeting(),
                            "business.svg",
                            area.id
                        );
                        this.onlineTeamsMeetingsCreated.delete(area.id);
                        this.closeCoWebSiteTeamsMeeting();
                    })
                    .finally(() => {
                        watchSpaceMetadataSubscribe.unsubscribe();
                        this.watchsSpaceMetadataSubscribe.delete(area.id);
                    });
                return;
            } else {
                console.warn(
                    "Error while parsing MSTeamsMeeting! Maybe your are Guest and the Teams Online meeting was not created!"
                );
            }

            if (this.isGuest) {
                // Show popup component
                this.closePopUpMeetingNotCreated();
                this.openPopUpMeetingNotCreated();
                return;
            }

            // Open the meeting
            this.onlineTeamsMeetingsCreated.add(area.id);
            this.createOrGetMeeting(area.id)
                .then(async (data) => {
                    await this.openCowebsiteTeamsMeeting(data);

                    const parseMSTeamsMeeting = MSTeamsMeeting.safeParse(data);
                    if (!parseMSTeamsMeeting.success) throw new Error("Error while parsing MSTeamsMeeting");

                    const newMetadata = new Map<string, unknown>(Object.entries(parseMSTeamsMeeting.data));
                    space?.setMetadata(newMetadata);
                    space?.emitUpdateSpaceMetadata(newMetadata);
                })
                .catch((error) => {
                    console.error(error);
                    notificationPlayingStore.removeNotificationById(area.id);
                    notificationPlayingStore.playNotification(
                        get(LL).externalModule.teams.unableJoinMeeting(),
                        "business.svg",
                        area.id
                    );
                    this.onlineTeamsMeetingsCreated.delete(area.id);
                    this.closeCoWebSiteTeamsMeeting();
                })
                .finally(() => {
                    watchSpaceMetadataSubscribe.unsubscribe();
                    this.watchsSpaceMetadataSubscribe.delete(area.id);
                });
        });

        this.watchsSpaceMetadataSubscribe.set(area.id, watchSpaceMetadataSubscribe);
        this.spaces.set(area.id, space);
    }

    private handleAreaPropertyOnLeave(area?: AreaData) {
        console.debug("Leaving extension module area");

        try {
            this.closeCoWebSiteTeamsMeeting();
        } catch (e) {
            console.error("Error when we try to close the cowebsite", e);
        }

        // leave space meeting
        if (area) {
            this.closePopUpMeetingNotCreated();
            notificationPlayingStore.removeNotificationById(area.id);
            this.watchsSpaceMetadataSubscribe.get(area.id)?.unsubscribe();
            const spaceArea = this.spaces.get(area.id);
            this.onlineTeamsMeetingsCreated.delete(area.id);
            if (spaceArea && this.moduleOptions.spaceRegistry) {
                this.moduleOptions.spaceRegistry.leaveSpace(spaceArea);
                this.spaces.delete(area.id);
            }
        }
    }

    private async openCowebsiteTeamsMeeting(data: MSTeamsMeeting) {
        if (this.cowebsiteOpenedId != undefined) return;
        const cowebsiteOpened = await this.openPopupMeetingWithMsTeams(data);
        this.cowebsiteOpenedId = cowebsiteOpened.id;
    }

    private closeCoWebSiteTeamsMeeting() {
        if (this.closeCoWebSite && this.cowebsiteOpenedId != undefined) this.closeCoWebSite(this.cowebsiteOpenedId);
        this.cowebsiteOpenedId = undefined;
    }

    get statusStore() {
        return this.teamsSynchronisationStore;
    }

    components() {
        return [TeamsPopupStatus];
    }

    async openPopupMeeting(
        subject: string,
        joinWebUrl: string,
        meetingId: string,
        startDateTime: Date,
        endDateTime: Date,
        passcode: string | undefined
    ): Promise<{ id: string }> {
        // Open cowebsite
        const URITeamsIframeLink = new URL(`${this.adminUrl}/iframe/ask-to-join-meeting-ms-teams`);
        URITeamsIframeLink.searchParams.append("joinMeetingId", meetingId);
        URITeamsIframeLink.searchParams.append("joinUrl", joinWebUrl);
        URITeamsIframeLink.searchParams.append("subject", subject);
        URITeamsIframeLink.searchParams.append("startDateTime", startDateTime.toISOString());
        URITeamsIframeLink.searchParams.append("endDateTime", endDateTime.toISOString());
        if (passcode) {
            URITeamsIframeLink.searchParams.append("passcode", passcode);
        }
        if (this.openCoWebSite){
            return await this.openCoWebSite(
                {
                    url: URITeamsIframeLink.toString(),
                    allowApi: true,
                    widthPercent: 30,
                    position: 1,
                },
                window
            );
        }
        throw new Error("Open CoWebSite is not defined");
    }

    private openPopupMeetingWithMsTeams(msTeamsMeeting: MSTeamsMeeting){
        if(this.callbackPostMessageApiEventStreamSubscription) this.callbackPostMessageApiEventStreamSubscription.unsubscribe();
        this.callbackPostMessageApiEventStreamSubscription = this.callbackPostMessageApiEventStream.subscribe((event) => {
            const parsedEvent = isExternalMsTeamsModuleEvent.safeParse(event);
            if (!parsedEvent.success) {
                console.error("Error while parsing event", parsedEvent.error);
                return;
            }

            switch (parsedEvent.data.data.name) {
                case `msteamsmeeting:${msTeamsMeeting.joinMeetingIdSettings.joinMeetingId}`:
                    if(parsedEvent.data.data.message == 'opened'){
                        console.log("openPopupMeetingWithMsTeams => queryWorkadventure", msTeamsMeeting);
                        // Close the cowebsite
                        // Open the modal with teams information to say that the meeting is in progress
                        iframeListener.postMessage({
                            type: "externalModuleEvent",
                            data:{
                                id: "ms-teams",
                                data: {
                                    name: `msteamsmeeting:${msTeamsMeeting.joinMeetingIdSettings.joinMeetingId}`,
                                    data: msTeamsMeeting
                                }
                            }
                        });
                    }
                    break;
                default:
                    break;
            }
        });
        return this.openPopupMeeting(
            msTeamsMeeting.subject,
            msTeamsMeeting.joinWebUrl,
            msTeamsMeeting.joinMeetingIdSettings.joinMeetingId,
            new Date(msTeamsMeeting.startDateTime),
            new Date(msTeamsMeeting.endDateTime),
            msTeamsMeeting.joinMeetingIdSettings.passcode || undefined
        );
    }

    openPopUpModuleStatus() {
        const externalSvelteComponent = get(this.moduleOptions.externalSvelteComponent);
        externalSvelteComponent.addPopupComponent("ms-teams-popup-status", this, TeamsPopupStatus);
    }

    closePopUpModuleStatus() {
        const externalSvelteComponent = get(this.moduleOptions.externalSvelteComponent);
        externalSvelteComponent.removePopupComponent("ms-teams-popup-status");
    }

    openPopUpMeetingNotCreated() {
        const externalSvelteComponent = get(this.moduleOptions.externalSvelteComponent);
        externalSvelteComponent.addPopupComponent(
            "ms-teams-popup-meeting-not-created",
            this,
            TeamsPopupMeetingNotCreated
        );
    }

    closePopUpMeetingNotCreated() {
        const externalSvelteComponent = get(this.moduleOptions.externalSvelteComponent);
        externalSvelteComponent.removePopupComponent("ms-teams-popup-meeting-not-created");
    }

    openPopUpModuleReconnect() {
        if (this.askDoNotShowAgainPopUpModuleReconnect === true) return;
        const externalSvelteComponent = get(this.moduleOptions.externalSvelteComponent);
        externalSvelteComponent.addPopupComponent("ms-teams-popup-reconnect", this, TeamsPopupReconnect);
        this.popUpModuleReconnect = true;
    }

    closePopUpModuleReconnect() {
        const externalSvelteComponent = get(this.moduleOptions.externalSvelteComponent);
        externalSvelteComponent.removePopupComponent("ms-teams-popup-reconnect");
        this.popUpModuleReconnect = false;
    }

    reconnectToTeams() {
        if (this.moduleOptions.logoutCallback) this.moduleOptions.logoutCallback();
    }

    dontShowAgainPopUpModuleReconnect() {
        this.askDoNotShowAgainPopUpModuleReconnect = true;
    }

    getOnlineMeetingByJoinMeetingId(joinMeetingId: string): Promise<MSTeamsMeeting> | undefined {
        return this.teamsOnLineMeetingService?.getOnlineMeetingByJoinMeetingId(joinMeetingId);
    }

    private readonly callbackPostMessageApiEventStream: Subject<ExternalModuleEvent> = new Subject();
    private callbackPostMessageApiEventStreamSubscription: Subscription | undefined;
    callbackPostMessageApiEvent(event: ExternalModuleEvent){
        this.callbackPostMessageApiEventStream.next(event);
    }

    get meetingSynchronised() {
        return this.roomMetadata.msTeamsSettings.communication;
    }
    get calendarSynchronised() {
        return this.roomMetadata.msTeamsSettings.calendar;
    }
    get presenceSynchronised() {
        return this.roomMetadata.msTeamsSettings.status;
    }
    get isGuest() {
        return this.clientId == undefined;
    }
    get todoListSynchronized() {
        return this.roomMetadata.msTeamsSettings.todoList === true;
    }
}

export default new MSTeams();
