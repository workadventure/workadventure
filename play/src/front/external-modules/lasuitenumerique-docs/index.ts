import axios, { AxiosError, AxiosInstance } from "axios";
import { z } from "zod";
import { AvailabilityStatus, ExternalModuleMessage, OauthRefreshToken } from "@workadventure/messages";
import { get, Readable, Unsubscriber, Updater, writable } from "svelte/store";
import { CalendarEventInterface } from "@workadventure/shared-utils";
import { AreaData, AreaDataProperties } from "@workadventure/map-editor";
import * as Sentry from "@sentry/svelte";
import Debug from "debug";
import { Subscription } from "rxjs";
import { notificationPlayingStore } from "../../Stores/NotificationStore";
import { ExtensionModule, ExtensionModuleOptions } from "../../ExternalModule/ExtensionModule";
import { NODE_ENV } from "../../Enum/EnvironmentVariable";
import { OpenCoWebsiteObject } from "../../Chat/Utils";
import LL from "../../../i18n/i18n-svelte";
import { SpaceInterface } from "../../Space/SpaceInterface";
import BusinessImg from "./Components/images/business.svg";
import { TeamsAvailability } from "./MSTeamsInterface";

import TeamsMeetingAreaPropertyEditor from "./Components/TeamsMeetingAreaPropertyEditor.svelte";
import AddTeamsMeetingAreaPropertyButton from "./Components/AddTeamsMeetingAreaPropertyButton.svelte";
import TeamsPopupStatus from "./Components/TeamsPopupStatus.svelte";
import TeamsAvailabilityStatusInformation from "./Components/TeamsAvailabilityStatusInformation.svelte";
import TeamsActionBarMenuItem from "./Components/TeamsActionBarMenuItem.svelte";
import TeamsPopupMeetingNotCreated from "./Components/TeamsPopupMeetingNotCreated.svelte";
import { TodolistService } from "./Services/Todolist";
import TeamsPopupReconnect from "./Components/TeamsPopupReconnect.svelte";
import { TeamsOnlineMeetingService } from "./Services/TeamsOnlineMeeting";
import { MSTeamsMeeting, TeamsMeetingPropertyData } from "../../../common/external-modules/lasuitenumerique-docs/MapEditor/types";
import { MsTeamsMetadata } from "./MsTeamsMetadata";
import { TeamsPresenceService } from "./Services/TeamsPresence";
import TeamsPopupOffline from "./Components/TeamsPopupOffline.svelte";
import LaSuiteNumeriqueDocsAreaPropertyEditor from "./Components/LaSuiteNumeriqueDocsAreaPropertyEditor.svelte";
import AddLaSuiteNumeriqueDocsAreaPropertyButton from "./Components/AddLaSuiteNumeriqueDocsAreaPropertyButton.svelte";

const debug = Debug("LaSuiteNumerique-Docs");

class LaSuiteNumeriqueDocs implements ExtensionModule {
    public id = "lasuitenumerqiue-docs";

    init(metadata: unknown, options: ExtensionModuleOptions) {
    }

    destroy() {
    }

    areaMapEditor() {
        return {
            laSuiteNumeriqueDocs: {
                AreaPropertyEditor: LaSuiteNumeriqueDocsAreaPropertyEditor,
                AddAreaPropertyButton: AddLaSuiteNumeriqueDocsAreaPropertyButton,
                handleAreaPropertyOnEnter: this.handleAreaPropertyOnEnter.bind(this),
                handleAreaPropertyOnLeave: this.handleAreaPropertyOnLeave.bind(this),
                shouldDisplayButton: (areaDataProperties: AreaDataProperties) => true,
                //getOnlineMeetingByJoinMeetingId: this.getOnlineMeetingByJoinMeetingId.bind(this),
            },
        };
    }

    components() {
        return [];
    }

    private handleAreaPropertyOnEnter(area: AreaData) {
        debug("Enter extension module area");
        this.inCurrentAreaId = area.id;

        // Check if the Teams property is defined
        const teamsAreaProperty = area.properties?.find(
            (property) => property.type === "extensionModule" && property.subtype === "teams"
        ) as TeamsMeetingPropertyData | undefined;
        if (teamsAreaProperty === undefined) {
            console.warn("Teams property is not defined, unable to join space, create or get meeting and share it!");
            notificationPlayingStore.removeNotificationById(area.id);
            notificationPlayingStore.playNotification(
                get(LL).externalModule.teams.unableJoinMeeting(),
                BusinessImg,
                area.id
            );
            return;
        }

        // Check if the property is well formatted and have join meeting id
        if (
            teamsAreaProperty.data != undefined &&
            (teamsAreaProperty.data.msTeamsMeeting ||
                teamsAreaProperty.data.teamsOnlineMeetingId ||
                teamsAreaProperty.data.teamsOnlineMeetingUrl)
        ) {
            try {
                console.info(
                    "Joining Teams meeting was defined in the area property",
                    teamsAreaProperty.data.msTeamsMeeting?.joinMeetingIdSettings?.joinMeetingId,
                    teamsAreaProperty.data.teamsOnlineMeetingId
                );
                notificationPlayingStore.removeNotificationById(area.id);
                notificationPlayingStore.playNotification(
                    get(LL).externalModule.teams.openingMeeting(),
                    BusinessImg,
                    area.id
                );
                const msTeamsMeeting =
                    teamsAreaProperty.data.msTeamsMeeting ??
                    (teamsAreaProperty.data.teamsOnlineMeetingId || teamsAreaProperty.data.teamsOnlineMeetingUrl);
                if (msTeamsMeeting == undefined) throw new Error("Error while getting MSTeamsMeeting");

                this.openCowebsiteTeamsMeeting(msTeamsMeeting, teamsAreaProperty.data?.shouldOpenAutomatically)
                    .then(() => {
                        this.onlineTeamsMeetingsCreated.add(area.id);
                    })
                    .catch((e) => {
                        console.error("Error while opening cowebsite Teams meeting", e);
                        this.closeCoWebSiteTeamsMeeting().catch((e) =>
                            console.error("Error while closing cowebsite", e)
                        );
                        throw e;
                    });
                return;
            } catch (e) {
                console.error("Error while joining Teams meeting", e);
                Sentry.captureException(e, { tags: { source: this.id } });
                notificationPlayingStore.removeNotificationById(area.id);
                notificationPlayingStore.playNotification(
                    get(LL).externalModule.teams.unableJoinMeeting(),
                    BusinessImg,
                    area.id
                );
                return;
            }
        }

        if (!this.moduleOptions.spaceRegistry) {
            console.warn("SpaceRegistry is not defined, unable to join space, create or get meeting and share it!");
            notificationPlayingStore.removeNotificationById(area.id);
            notificationPlayingStore.playNotification(
                get(LL).externalModule.teams.unableJoinMeeting(),
                BusinessImg,
                area.id
            );
            return;
        }
        // join space meeting
        debug("SpaceRegistry is defined, join space, create or get meeting and share it!", `msteams-${area.id}`);
        let _space = undefined;
        try {
            _space = this.moduleOptions.spaceRegistry.get(`msteams-${area.id}`);
        } catch (e) {
            console.info("Error while joining space", e);
            this.openPopUpMeetingNotCreated();
        }
        const space = _space ? _space : this.moduleOptions.spaceRegistry.joinSpace(`msteams-${area.id}`);

        notificationPlayingStore.removeNotificationById(area.id);
        notificationPlayingStore.playNotification(get(LL).externalModule.teams.openingMeeting(), BusinessImg, area.id);

        const watchSpaceMetadataSubscribe = space.watchSpaceMetadata().subscribe((value) => {
            debug("Watch space metadata", value);

            // apply setTimeout to avoid multiple calls
            // FIXME: This is a workaround to avoid multiple calls to create a meeting
            if (this.timeoutSpaveMetadata) clearTimeout(this.timeoutSpaveMetadata);
            this.timeoutSpaveMetadata = setTimeout(() => {
                (async () => {
                    // If the space has a meeting, open the meeting and clear the timeout to create a new meeting
                    const parseMSTeamsMeeting = MSTeamsMeeting.safeParse(JSON.parse(value.metadata));
                    if (parseMSTeamsMeeting.success) {
                        notificationPlayingStore.removeNotificationById(area.id);
                        notificationPlayingStore.playNotification(
                            get(LL).externalModule.teams.openingMeeting(),
                            BusinessImg,
                            area.id
                        );

                        if (this.onlineTeamsMeetingsCreated.has(area.id)) {
                            // in some case, when two people enter the same area at the same time, the meeting is created twice
                            // so we need to wait what the first proccess finish to close the cowebsite and open the new one
                            await this.creatingMeetingPromise;
                        } else this.onlineTeamsMeetingsCreated.add(area.id);

                        this.openCowebsiteTeamsMeeting(
                            parseMSTeamsMeeting.data,
                            teamsAreaProperty.data?.shouldOpenAutomatically
                        )
                            .then(() => {
                                // Remove popup component
                                this.closePopUpMeetingNotCreated();
                            })
                            .catch((e) => {
                                console.error("Error while opening cowebsite Teams meeting", e);
                                Sentry.captureException(e, { tags: { source: this.id } });
                                notificationPlayingStore.removeNotificationById(area.id);
                                notificationPlayingStore.playNotification(
                                    get(LL).externalModule.teams.unableJoinMeeting(),
                                    BusinessImg,
                                    area.id
                                );
                                this.onlineTeamsMeetingsCreated.delete(area.id);
                                this.closeCoWebSiteTeamsMeeting().catch((e) =>
                                    console.error("Error while closing cowebsite", e)
                                );
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

                    if (this.onlineTeamsMeetingsCreated.has(area.id)) {
                        // in some case, when two people enter the same area at the same time, the meeting is created twice
                        // so we need to wait what the first proccess finish to close the cowebsite and open the new one
                        await this.creatingMeetingPromise;
                    } else this.onlineTeamsMeetingsCreated.add(area.id);

                    this.creatingMeetingPromise = this.teamsOnLineMeetingService
                        ?.createOnlineMeeting()
                        .then(({ data }) => {
                            // Close the popup component
                            this.closePopUpMeetingNotCreated();

                            this.openCowebsiteTeamsMeeting(data, teamsAreaProperty.data?.shouldOpenAutomatically).catch(
                                (e) => console.error(e)
                            );

                            const parseMSTeamsMeeting = MSTeamsMeeting.safeParse(data);
                            if (!parseMSTeamsMeeting.success) throw new Error("Error while parsing MSTeamsMeeting");

                            const newMetadata = new Map<string, unknown>(Object.entries(parseMSTeamsMeeting.data));
                            space?.setMetadata(newMetadata);
                            space?.emitUpdateSpaceMetadata(newMetadata);
                        })
                        .catch((error) => {
                            console.error(error);
                            Sentry.captureException(error, { tags: { source: this.id } });
                            notificationPlayingStore.removeNotificationById(area.id);
                            notificationPlayingStore.playNotification(
                                get(LL).externalModule.teams.unableJoinMeeting(),
                                BusinessImg,
                                area.id
                            );
                            this.onlineTeamsMeetingsCreated.delete(area.id);
                            this.closeCoWebSiteTeamsMeeting().catch((e) =>
                                console.error("Error while closing cowebsite", e)
                            );
                        });
                })().catch((e) => console.error(e));
            }, 800);

            this.watchsSpaceMetadataSubscribe.set(area.id, watchSpaceMetadataSubscribe);
            this.spaces.set(area.id, space);
        });
    }

    private handleAreaPropertyOnLeave(area?: AreaData) {

    }
}

export default new LaSuiteNumeriqueDocs();
