import axios, { AxiosError, AxiosInstance } from "axios";
import { z } from "zod";
import { AvailabilityStatus, ExternalModuleMessage, OauthRefreshToken } from "@workadventure/messages";
import { subscribe } from "svelte/internal";
import { get, Readable, Unsubscriber, Updater, writable } from "svelte/store";
import { CalendarEventInterface } from "@workadventure/shared-utils";
import { AreaData, AreaDataProperties } from "@workadventure/map-editor";
import { notificationPlayingStore } from "../../front/Stores/NotificationStore";
import { ExtensionModule, ExtensionModuleOptions, RoomMetadataType } from "../../front/ExternalModule/ExtensionModule";
import { NODE_ENV } from "../../front/Enum/EnvironmentVariable";
import { OpenCoWebsiteObject } from "../../front/Chat/Utils";
import LL from "../../i18n/i18n-svelte";
import { TeamsActivity, TeamsAvailability } from "./MSTeamsInterface";

import TeamsMeetingAreaPropertyEditor from "./Components/TeamsMeetingAreaPropertyEditor.svelte";
import AddTeamsMeetingAreaPropertyButton from "./Components/AddTeamsMeetingAreaPropertyButton.svelte";
import TeamsPopupStatus from "./Components/TeamsPopupStatus.svelte";
import TeamsAvailabilityStatusInformation from "./Components/TeamsAvailabilityStatusInformation.svelte";
import TeamsActionBar from "./Components/TeamsActionBar.svelte";
import { SpaceInterface } from "../../front/Space/SpaceInterface";
import { Subscription } from "rxjs";

const MS_GRAPH_ENDPOINT_V1 = "https://graph.microsoft.com/v1.0";
const MS_GRAPH_ENDPOINT_BETA = "https://graph.microsoft.com/beta";
const MS_ME_ENDPOINT = "/me";
const MS_ME_PRESENCE_ENDPOINT = "/presence";

enum MSGraphMessageEventSource {
    MicrosoftGraphPresence = "#Microsoft.Graph.presence",
    MicrosoftGraphEvent = "#Microsoft.Graph.Event",
    MicrosoftGraphSubscription = "#Microsoft.Graph.subscription",
}

export interface MSTeamsExtensionModule extends ExtensionModule {
    checkModuleSynschronisation: () => void;
    statusStore: Readable<TeamsModuleStatus>;
    meetingSynchronised: boolean;
    presenceSynchronised: boolean;
    openPopUpModuleStatus: () => void;
    closePopUpModuleStatus: () => void;
}

export enum TeamsModuleStatus {
    ONLINE = "online",
    WARNING = "warning",
    SYNC = "sync",
    OFFLINE = "offline",
}

interface MSTeamsMeeting {
    id: string;
    subject: string;
    startDateTime: string;
    endDateTime: string;
    joinUrl: string;
    joinWebUrl: string;
    joinMeetingIdSettings: {
        isPasscodeRequired: boolean;
        joinMeetingId: string;
        passcode?: string;
    };
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
    subject: string;
    bodyPreview: string;
}

interface MSGraphSubscriptionResponse {
    data: MSGraphSubscription;
}
interface MSGraphSubscription {
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
    private space: SpaceInterface | undefined;

    private observePublicEventUnsubscribe?: Subscription;
    private observeUserJoinedUnsubscribe?: Subscription;
    private setTimeoutOpenMeeting?: NodeJS.Timeout;

    init(roomMetadata: RoomMetadataType, options: ExtensionModuleOptions) {
        this.roomMetadata = roomMetadata;
        this.moduleOptions = options;
        this.userAccessToken = this.moduleOptions.userAccessToken;
        this.adminUrl = this.moduleOptions.adminUrl;
        this.roomId = this.moduleOptions.roomId;

        this.openCoWebSite = this.moduleOptions.openCoWebSite;
        this.closeCoWebSite = this.moduleOptions.closeCoWebsite;

        this.teamsSynchronisationStore.set(TeamsModuleStatus.SYNC);

        const microsoftTeamsMetadata = roomMetadata?.player?.accessTokens ? roomMetadata.player.accessTokens[0] : undefined;
        if (microsoftTeamsMetadata === undefined || roomMetadata.player?.accessTokens?.length === 0) {
            console.error("Microsoft teams metadata is undefined. Cancelling the initialization");
            return;
        }

        this.msAxiosClientV1 = axios.create({
            baseURL: MS_GRAPH_ENDPOINT_V1,
            headers: {
                Authorization: `Bearer ${microsoftTeamsMetadata.token}`,
                "Content-Type": "application/json",
            },
        });
        this.msAxiosClientV1.interceptors.response.use(null, (error) =>
            this.refreshTokenInterceptor(error, this.moduleOptions.getOauthRefreshToken)
        );

        this.msAxiosClientBeta = axios.create({
            baseURL: MS_GRAPH_ENDPOINT_BETA,
            headers: {
                Authorization: `Bearer ${microsoftTeamsMetadata.token}`,
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
                    if (this.moduleOptions.workadventureStatusStore) {
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
                    setInterval(() => {
                        this.updateCalendarEvents().catch((e) =>
                            console.error("Error while updating calendar events", e)
                        );
                    }, 1000 * 10 * 10);

                    // So we replace the webhook by sending a call API every 10 seconds
                    setInterval(() => {
                        this.listenToTeamsStatusUpdate(this.moduleOptions.onExtensionModuleStatusChange).catch((e) =>
                            console.error("Error while listening Teams status update", e)
                        );
                    }, 1000 * 10);
                }
            })
            .catch((e) => console.error("Error while initializing Microsoft Teams module", e));

        if (this.moduleOptions.externalModuleMessage) {
            // The externalModuleMessage is completed in the RoomConnection. No need to unsubscribe.
            //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
            this.moduleOptions.externalModuleMessage.subscribe((externalModuleMessage: ExternalModuleMessage) => {
                console.info("Message received from external module", externalModuleMessage);
                const type = externalModuleMessage.message["@odata.type"];
                switch (type.toLowerCase()) {
                    case MSGraphMessageEventSource.MicrosoftGraphPresence.toLocaleLowerCase():
                        if (!this.moduleOptions.onExtensionModuleStatusChange) break;
                        // Update the teams status of this module and do not call API to set presence
                        this.teamsAvailability = externalModuleMessage.message.availability;

                        // Update the workadventure status
                        this.moduleOptions.onExtensionModuleStatusChange(
                            this.mapTeamsStatusToWorkAdventureStatus(externalModuleMessage.message.availability)
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
                    default:
                        console.warn("Unknown message type", type);
                        break;
                }
                return externalModuleMessage;
            });
        }

        console.info("Microsoft teams module for WorkAdventure initialized");
        this.teamsSynchronisationStore.set(TeamsModuleStatus.ONLINE);

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
                    this.msAxiosClientV1.defaults.headers.common.Authorization = `Bearer ${token}`;
                    console.info("Microsoft teams token has been refreshed");
                })
                .catch((error) => {
                    throw error;
                });
        }
        return error;
    }

    listenToTeamsStatusUpdate(onTeamsStatusChange?: (workAdventureNewStatus: AvailabilityStatus) => void) {
        return this.msAxiosClientV1
            .get<unknown>(`/users/${this.clientId}/${MS_ME_PRESENCE_ENDPOINT}`)
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

                onTeamsStatusChange(this.mapTeamsStatusToWorkAdventureStatus(userPresenceResponse.data.availability));
                this.teamsAvailability = userPresenceResponse.data.availability;
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
        if (this.roomMetadata.msTeamsSettings.status) {
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
            // If there is no subscription, reinitialize the subscription
            if (subscriptions.data.value.length < 2) {
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
            for (const subscription of subscriptions.data.value) {
                if (new Date(subscription.expirationDateTime) < new Date()) {
                    if (subscription.resource === `/communications/presences/${this.clientId}`) {
                        promisesDeleteSubscription.push(this.deletePresenceSubscription(subscription.id));
                    } else if (subscription.resource === `/me/events`) {
                        promisesDeleteSubscription.push(this.deleteCalendarSubscription(subscription.id));
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
            // If expiration is not expired, return the subscription
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
            },
        };
    }

    private handleAreaPropertyOnEnter(area: AreaData) {
        console.debug("Enter extension module area");

        // join space meeting
        if(this.moduleOptions.spaceRegistry){
            console.debug("SpaceRegistry is defined, join space, create or get meeting and share it!", `msteams-${area.id}`);
            let _space = undefined;
            try{
                _space = this.moduleOptions.spaceRegistry.get(`msteams-${area.id}`);
            }catch(e){
                console.info("Error while joining space", e);
            }
            this.space = _space ? _space : this.moduleOptions.spaceRegistry.joinSpace(`msteams-${area.id}`);

            // Get metadata of the space,
            // If the space has a meeting, open the meeting
            const metadata = this.space.getMetadata();
            if(metadata.get('joinMeetingIdSettings') !== undefined){
                this.openPopupMeeting(
                    metadata.get('subject') as string,
                    metadata.get('joinWebUrl') as string,
                    (metadata.get('joinMeetingIdSettings') as { joinMeetingId: string, passcode?: string }).joinMeetingId,
                    new Date(metadata.get('startDateTime') as string),
                    new Date(metadata.get('endDateTime') as string),
                    (metadata.get('joinMeetingIdSettings') as { joinMeetingId: string, passcode?: string }).passcode,
                ).then((cowebsiteOpened) => {
                    this.cowebsiteOpenedId = cowebsiteOpened.id;
                });
                return;
            }
        }else{
            console.error("SpaceRegistry is not defined, unable to join space, create or get meeting and share it!");
            return;
        }

        notificationPlayingStore.playNotification(
            get(LL).externalModule.teams.openingMeeting(),
            "business.svg",
            area.id
        );

        let meetingCreated = false;
        this.observePublicEventUnsubscribe = this.space.observePublicEvent("spaceMessage").subscribe((event) => {
            const message: MSTeamsMeeting = JSON.parse(event.spaceMessage.message);
            meetingCreated = true;

            // Open the meeting
            this.openCowebsiteTeamsMeeting(message);

            // Unsuscribe to the event
            this.observePublicEventUnsubscribe?.unsubscribe();
        });

        // FIXME: with the new space registry, we need to wait for the space to be created
        if(this.setTimeoutOpenMeeting) clearTimeout(this.setTimeoutOpenMeeting);
        this.setTimeoutOpenMeeting = setTimeout(() => {
            if(meetingCreated) return;
            if(this.clientId) {
                this.createOrGetMeeting(area.id)
                    .then(async (data) => {
                        // Open the meeting
                        this.openCowebsiteTeamsMeeting(data);
    
                        // Save the meeting data in the space metadata
                        const metadata = new Map<string, unknown>();
                        metadata.set('subject', data.subject);
                        metadata.set('startDateTime', data.startDateTime);
                        metadata.set('endDateTime', data.endDateTime);
                        metadata.set('joinWebUrl', data.joinWebUrl);
                        metadata.set('joinMeetingIdSettings', data.joinMeetingIdSettings);
    
                        this.space?.setMetadata(metadata);
                        const filter = this.space?.watchAllUsers();
                        this.observeUserJoinedUnsubscribe = filter?.observeUserJoined.subscribe((event) => {
                            this.space?.emitPublicMessage({
                                $case: "spaceMessage",
                                spaceMessage: {
                                    message: JSON.stringify(data)
                                }
                            });
                        });
                    })
                    .catch((error) => {
                        console.error(error);
                        notificationPlayingStore.removeNotificationById(area.id);
                        notificationPlayingStore.playNotification(
                            get(LL).externalModule.teams.unableJoinMeeting(),
                            "business.svg",
                            area.id
                        );
                    });
            }
        }, 2000);
    }

    private async openCowebsiteTeamsMeeting(data: MSTeamsMeeting) {
        const cowebsiteOpened = await this.openPopupMeeting(
            data.subject,
            data.joinWebUrl,
            data.joinMeetingIdSettings.joinMeetingId,
            new Date(data.startDateTime),
            new Date(data.endDateTime),
            data.joinMeetingIdSettings.passcode
        );
        this.cowebsiteOpenedId = cowebsiteOpened.id;
    }

    private handleAreaPropertyOnLeave(area?: AreaData) {
        // leave space meeting
        this.observePublicEventUnsubscribe?.unsubscribe();
        this.observeUserJoinedUnsubscribe?.unsubscribe();
        if(this.space && this.moduleOptions.spaceRegistry){
            this.moduleOptions.spaceRegistry.leaveSpace(this.space);
        }

        console.debug("Leaving extension module area");
        if (area) notificationPlayingStore.removeNotificationById(area.id);

        try {
            if (this.cowebsiteOpenedId && this.closeCoWebSite) this.closeCoWebSite(this.cowebsiteOpenedId);
        } catch (e) {
            console.error("Error when we try to close the cowebsite", e);
        } finally {
            this.cowebsiteOpenedId = undefined;
        }
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
        if (this.openCoWebSite)
            return await this.openCoWebSite(
                {
                    url: URITeamsIframeLink.toString(),
                    allowApi: true,
                    widthPercent: 30,
                    position: 1,
                },
                window
            );
        throw new Error("Open CoWebSite is not defined");
    }

    openPopUpModuleStatus() {
        const externalSvelteComponent = get(this.moduleOptions.externalSvelteComponent);
        externalSvelteComponent.addPopupComponent("ms-teams-popup-status", this, TeamsPopupStatus);
    }

    closePopUpModuleStatus() {
        const externalSvelteComponent = get(this.moduleOptions.externalSvelteComponent);
        externalSvelteComponent.removePopupComponent("ms-teams-popup-status");
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
}

export default new MSTeams();
