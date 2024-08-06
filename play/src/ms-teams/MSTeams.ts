import axios, { AxiosError, AxiosInstance } from "axios";
import { z } from "zod";
import { AvailabilityStatus, ExternalModuleMessage, OauthRefreshToken } from "@workadventure/messages";
import { subscribe } from "svelte/internal";
import { Unsubscriber, Updater, writable } from "svelte/store";
import { CalendarEventInterface } from "@workadventure/shared-utils";
import { AreaData, AreaDataProperties } from "@workadventure/map-editor";
import { notificationPlayingStore } from "../front/Stores/NotificationStore";
import {
    ExtensionModule,
    ExtensionModuleOptions,
    ExternalModuleStatus,
    RoomMetadataType,
} from "../front/ExternalModule/ExtensionModule";
import { NODE_ENV } from "../front/Enum/EnvironmentVariable";
import { TeamsActivity, TeamsAvailability } from "./MSTeamsInterface";

import TeamsMeetingAreaPropertyEditor from "./Components/TeamsMeetingAreaPropertyEditor.svelte";
import AddTeamsMeetingAreaPropertyButton from "./Components/AddTeamsMeetingAreaPropertyButton.svelte";
import TeamsPopupStatus from "./Components/TeamsPopupStatus.svelte";
import TeamsPopupLuncher from "./Components/TeamsPopupLuncher.svelte";

const MS_GRAPH_ENDPOINT_V1 = "https://graph.microsoft.com/v1.0";
const MS_GRAPH_ENDPOINT_BETA = "https://graph.microsoft.com/beta";
const MS_ME_ENDPOINT = "/me";
const MS_ME_PRESENCE_ENDPOINT = "/me/presence";

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

class MSTeams implements ExtensionModule {
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

    private teamsSynchronisationStore = writable<ExternalModuleStatus>(ExternalModuleStatus.SYNC);

    private teamsPopupLuncher: TeamsPopupLuncher | undefined = undefined;

    init(roomMetadata: RoomMetadataType, options?: ExtensionModuleOptions) {
        this.roomMetadata = roomMetadata;
        this.teamsSynchronisationStore.set(ExternalModuleStatus.SYNC);
        const microsoftTeamsMetadata = roomMetadata.player.accessTokens[0];
        if (roomMetadata.player.accessTokens.length === 0 && microsoftTeamsMetadata === undefined) {
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
            this.refreshTokenInterceptor(error, options?.getOauthRefreshToken)
        );

        this.msAxiosClientBeta = axios.create({
            baseURL: MS_GRAPH_ENDPOINT_BETA,
            headers: {
                Authorization: `Bearer ${microsoftTeamsMetadata.token}`,
                "Content-Type": "application/json",
            },
        });
        this.msAxiosClientBeta.interceptors.response.use(null, (error) =>
            this.refreshTokenInterceptor(error, options?.getOauthRefreshToken)
        );
        this.setMSTeamsClientId();

        this.userAccessToken = options!.userAccessToken;
        this.adminUrl = options!.adminUrl;
        this.roomId = options!.roomId;

        if (roomMetadata.teamsstings.status) {
            this.listenToTeamsStatusUpdate(options?.onExtensionModuleStatusChange);
            if (options?.workadventureStatusStore) {
                this.listenToWorkadventureStatus = subscribe(
                    options?.workadventureStatusStore,
                    (workadventureStatus: AvailabilityStatus) => {
                        this.setStatus(workadventureStatus);
                    }
                );
            }
        }

        if (roomMetadata.teamsstings.calendar && options?.calendarEventsStoreUpdate) {
            this.calendarEventsStoreUpdate = options?.calendarEventsStoreUpdate;
            this.updateCalendarEvents().catch((e) => console.error("Error while updating calendar events", e));
        }

        if (options?.externalModuleMessage) {
            // The externalModuleMessage is completed in the RoomConnection. No need to unsubscribe.
            //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
            options.externalModuleMessage.subscribe((externalModuleMessage: ExternalModuleMessage) => {
                console.info("Message received from external module", externalModuleMessage);
                const type = externalModuleMessage.message["@odata.type"];
                switch (type) {
                    case "#Microsoft.Graph.presence":
                        // get the presence status
                        if (options?.onExtensionModuleStatusChange)
                            options?.onExtensionModuleStatusChange(
                                this.mapTeamsStatusToWorkAdventureStatus(externalModuleMessage.message.availability)
                            );
                        break;
                    case "#Microsoft.Graph.Event":
                        this.updateCalendarEvents().catch((e) =>
                            console.error("Error while updating calendar events", e)
                        );
                        break;
                    case "#Microsoft.Graph.subscription":
                        this.checkModuleSynschronisation().catch((e) =>
                            console.error("Error while reauthorizing subscriptions", e)
                        );
                        break;
                    default:
                        console.error("Unknown message type", type);
                        break;
                }
                return externalModuleMessage;
            });
        }

        // Initialize the subscription
        if (this.adminUrl != undefined) {
            this.initSubscription();
        } else {
            console.info("Admin URL is not defined. Subscription to Graph API webhook is not possible!");
        }

        console.info("Microsoft teams module for WorkAdventure initialized");
        this.teamsSynchronisationStore.set(ExternalModuleStatus.ONLINE);

        // In development mode, we can't use the webhook because the server is not accessible from the internet
        if ((this.adminUrl == undefined || this.adminUrl.indexOf("localhost") !== -1) && NODE_ENV !== "production") {
            // So we replace the webhook by sending a call API every 10 minutes
            setInterval(() => {
                this.updateCalendarEvents().catch((e) => console.error("Error while updating calendar events", e));
            }, 1000 * 10 * 10);

            // So we replace the webhook by sending a call API every 10 seconds
            setInterval(() => {
                this.listenToTeamsStatusUpdate(options?.onExtensionModuleStatusChange);
            }, 1000 * 10);
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
        this.msAxiosClientV1
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

                onTeamsStatusChange(this.mapTeamsStatusToWorkAdventureStatus(userPresenceResponse.data.availability));
                this.teamsAvailability = userPresenceResponse.data.availability;
            })
            .catch((e) => console.error("Error while getting MSTeams status", e));
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

        this.msAxiosClientV1
            .post(this.getUrlForSettingUserPresence(), {
                availability: newTeamsAvailability,
                activity: newTeamsAvailability,
            })
            .then(() => {
                console.info(`Your presence status has been set to ${newTeamsAvailability}`);
            })
            .catch((e) => console.error(e));
    }

    private getUrlForSettingUserPresence() {
        return `/users/${this.clientId}/presence/setUserPreferredPresence`;
    }

    joinMeeting() {
        console.log("joinTeamsMeeting : Not Implemented");
    }

    destroy() {
        if (this.listenToWorkadventureStatus !== undefined) {
            this.listenToWorkadventureStatus();
        }
        this.destroySubscription().catch((e) => console.error("Error while destroying subscription", e));
    }

    private setMSTeamsClientId() {
        const meResponseObject = z.object({
            id: z.string(),
        });

        this.msAxiosClientV1
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

    private initSubscription(): void {
        console.info("Init module synchronization check");

        // Initialize the subscription for presence
        if (this.roomMetadata.teamsstings.status)
            this.createOrGetPresenceSubscription().catch((e) =>
                console.error("Error while creating presence subscription", e)
            );

        // Initialize the subscription for calendar
        if (this.roomMetadata.teamsstings.calendar)
            this.createOrGetCalendarSubscription().catch((e) =>
                console.error("Error while creating calendar subscription", e)
            );

        // All 10 minutes, check if the subscriptions are expired
        const checkModuleSynchronisationIntervalMinutes = 10 * 60 * 1000;
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
        if (!this.adminUrl) {
            console.info("Admin URL is not defined. Subscription to Graph API webhook is not possible!");
            return;
        }
        this.teamsSynchronisationStore.set(ExternalModuleStatus.SYNC);
        console.info("Check module synchronization");
        // Use interval with base value to 10 minutes. If there is an error, the interval will be set to 1 minutes
        let checkModuleSynchronisationIntervalMinutes = 10 * 60 * 1000;

        // Get all subscription
        const subscriptions = await this.msAxiosClientBeta.get(`/subscriptions/`);

        try {
            // If there is no subscription, reinitialize the subscription
            if (subscriptions.data.value.length === 0) {
                this.initSubscription();
            } else {
                // Check if the subscription already exists
                const promisesReauthorizeSubscription = [];
                for (const subscription of subscriptions.data.value) {
                    if (new Date(subscription.expirationDateTime) < new Date()) {
                        if (subscription.resource === `/communications/presences/${this.clientId}`) {
                            promisesReauthorizeSubscription.push(this.reauthorizePresenceSubscription(subscription.id));
                        } else if (subscription.resource === `/me/events`) {
                            promisesReauthorizeSubscription.push(this.reauthorizeCalendarSubscription(subscription.id));
                        }
                    }
                }

                // If there are expired subscription, reauthorize them
                if (promisesReauthorizeSubscription.length > 0) await Promise.all(promisesReauthorizeSubscription);
                this.teamsSynchronisationStore.set(ExternalModuleStatus.ONLINE);
            }
        } catch (e) {
            this.teamsSynchronisationStore.set(ExternalModuleStatus.WARNING);
            console.error("Error while reauthorizing subscriptions", e);
            // If there is an error, delete subscription
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
                this.initSubscription();
            } catch (e) {
                // If there is an error, retry in 1 minutes
                console.error("Error while reinitializing subscriptions", e);
                // Indicate to the user that the synchronization is not working and new tentative will be done in 1 minutes
                checkModuleSynchronisationIntervalMinutes = 1 * 60 * 1000;
                // TODO show error message
            }
        }
        // All 10 minutes, check if the subscriptions are expired
        if (this.checkModuleSynschronisationInterval !== undefined)
            clearTimeout(this.checkModuleSynschronisationInterval);
        this.checkModuleSynschronisationInterval = setTimeout(() => {
            this.checkModuleSynschronisation().catch((e) =>
                console.error("Error while reauthorizing subscriptions", e)
            );
        }, checkModuleSynchronisationIntervalMinutes);
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
    private async createOrGetPresenceSubscription(): Promise<MSGraphSubscription> {
        // Check if the subscription already exists
        const subscriptions = await this.msAxiosClientV1.get(`/subscriptions`);
        if (subscriptions.data.value.length > 0) {
            const presenceSubscription = subscriptions.data.value.find(
                (subscription: MSGraphSubscription) =>
                    subscription.resource === `/communications/presences/${this.clientId}`
            );
            // Check if the subscription is expired
            if (presenceSubscription != undefined && new Date(presenceSubscription.expirationDateTime) < new Date()) {
                try {
                    // If there are expired subscription, reauthorize them
                    await this.reauthorizePresenceSubscription(presenceSubscription.id);
                    return presenceSubscription;
                } catch (e) {
                    console.info("Error while reauthorizing presence subscription", e);
                    // Delete the subscription and create a new one
                    try {
                        await this.deletePresenceSubscription(presenceSubscription.id);
                    } catch (e) {
                        console.error("Error while deleting presence subscription", e);
                    }
                }
            }
        }

        // Experiation date is 60 minutes, check the graph documentation for more information
        // https://docs.microsoft.com/en-us/graph/api/subscription-post-subscriptions?view=graph-rest-1.0
        const expirationDateTime = new Date();
        expirationDateTime.setMinutes(expirationDateTime.getMinutes() + 3);

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
    private async createOrGetCalendarSubscription(): Promise<MSGraphSubscription> {
        // Check if the subscription already exists
        const subscriptions = await this.msAxiosClientBeta.get(`/subscriptions`);
        if (subscriptions.data.value.length > 0) {
            const calendarSubscription = subscriptions.data.value.find(
                (subscription: MSGraphSubscription) => subscription.resource === `/me/events`
            );
            // Check if the subscription is expired
            if (calendarSubscription != undefined && new Date(calendarSubscription.expirationDateTime) < new Date()) {
                try {
                    // If there are expired subscription, reauthorize them
                    await this.reauthorizeCalendarSubscription(calendarSubscription.id);
                    return calendarSubscription;
                } catch (e) {
                    console.info("Error while reauthorizing calendar subscription", e);
                    // Delete the subscription and create a new one
                    try {
                        await this.deleteCalendarSubscription(calendarSubscription.id);
                    } catch (e) {
                        console.error("Error while deleting calendar subscription", e);
                    }
                }
            }
        }

        // Expiration date is 3 days for online meeting, check the graph documentation for more information
        // https://docs.microsoft.com/en-us/graph/api/subscription-post-subscriptions?view=graph-rest-1.0
        const expirationDateTime = new Date();
        expirationDateTime.setMinutes(expirationDateTime.getMinutes() + 3);

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

    private async reauthorizePresenceSubscription(subscriptionId: string): Promise<void> {
        // Experiation date is 60 minutes, check the graph documentation for more information
        // https://docs.microsoft.com/en-us/graph/api/subscription-post-subscriptions?view=graph-rest-1.0
        const expirationDateTime = new Date();
        expirationDateTime.setMinutes(expirationDateTime.getMinutes() + 60);
        await this.msAxiosClientBeta.post(`/subscriptions/${subscriptionId}/reauthorize`);
        await this.msAxiosClientBeta.patch(`/subscriptions/${subscriptionId}`, {
            expirationDateTime,
        });
    }

    private async reauthorizeCalendarSubscription(subscriptionId: string): Promise<void> {
        // Expiration date is 3 days for online meeting, check the graph documentation for more information
        // https://docs.microsoft.com/en-us/graph/api/subscription-post-subscriptions?view=graph-rest-1.0
        const expirationDateTime = new Date();
        expirationDateTime.setDate(expirationDateTime.getDate() + 3);

        await this.msAxiosClientV1.post(`/subscriptions/${subscriptionId}/reauthorize`);
        await this.msAxiosClientV1.patch(`/subscriptions/${subscriptionId}`, {
            expirationDateTime,
        });
    }

    areaMapEditor() {
        if (!this.roomMetadata.teamsstings.communication) return;
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
        notificationPlayingStore.playNotification("Opening Teams Meeting...", undefined, area.id);
        this.createOrGetMeeting(area.id)
            .then((data) => {
                this.openPopupMeeting(
                    data.subject,
                    data.joinWebUrl,
                    data.joinMeetingIdSettings.joinMeetingId,
                    new Date(data.startDateTime),
                    new Date(data.endDateTime),
                    data.joinMeetingIdSettings.passcode
                );
            })
            .catch((error) => {
                console.error(error);
                notificationPlayingStore.removeNotificationById(area.id);
                notificationPlayingStore.playNotification("Unable to join Teams Meeting", undefined, area.id);
            });
    }

    private handleAreaPropertyOnLeave(area?: AreaData) {
        if (area) notificationPlayingStore.removeNotificationById(area.id);

        if (this.teamsPopupLuncher) this.teamsPopupLuncher.$destroy();

        console.debug("Leaving extension module area");
    }

    get statusStore() {
        return this.teamsSynchronisationStore;
    }

    components() {
        return [TeamsPopupStatus];
    }

    openPopupMeeting(
        subject: string,
        joinWebUrl: string,
        meetingId: string,
        startDateTime: Date,
        endDateTime: Date,
        passcode: string | undefined
    ) {
        console.info("Opening Teams Meeting", joinWebUrl);

        // Add the popup teams component to the store
        const elementTarget = document.getElementById("main-layout-main");
        if (elementTarget === null) throw new Error("Unable to find the main-layout-main element");

        this.teamsPopupLuncher = new TeamsPopupLuncher({
            target: elementTarget,
            props: {
                subject: subject,
                joinWebUrl: joinWebUrl,
                passcode: passcode,
                meetingId: meetingId,
                startDateTime: startDateTime,
                endDateTime: endDateTime,
            },
        });
        this.teamsPopupLuncher.$on("close", () => {
            if (this.teamsPopupLuncher) this.teamsPopupLuncher.$destroy();
        });
    }
}

export default new MSTeams();
