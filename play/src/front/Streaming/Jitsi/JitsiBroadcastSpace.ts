import debug from "debug";
import pLimit from "p-limit";
import * as Sentry from "@sentry/svelte";
import { derived, get, Readable, Unsubscriber } from "svelte/store";
import type JitsiConnection from "lib-jitsi-meet/types/hand-crafted/JitsiConnection";
import { ForwardableStore } from "@workadventure/store-utils";
import { RoomConnection } from "../../Connection/RoomConnection";
import { gameManager } from "../../Phaser/Game/GameManager";
import { liveStreamingEnabledStore } from "../../Stores/MegaphoneStore";
import { BroadcastService } from "../BroadcastService";
import { BroadcastSpace } from "../Common/BroadcastSpace";
import { JITSI_DOMAIN, JITSI_MUC_DOMAIN, JITSI_XMPP_DOMAIN } from "../../Enum/EnvironmentVariable";
import { SpaceInterface } from "../../Space/SpaceInterface";
import { SpaceRegistryInterface } from "../../Space/SpaceRegistry/SpaceRegistryInterface";
import { SpaceFilterInterface } from "../../Space/SpaceFilter/SpaceFilter";
import { bindMuteEventsToSpace } from "../../Space/Utils/BindMuteEvents";
import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
import { notificationPlayingStore } from "../../Stores/NotificationStore";
import LL from "../../../i18n/i18n-svelte";
import { jitsiConferencesStore } from "./JitsiConferencesStore";
import { JitsiConferenceWrapper } from "./JitsiConferenceWrapper";
import { JitsiTrackWrapper } from "./JitsiTrackWrapper";
import { libJitsiFactory } from "./LibJitsiFactory";

const limit = pLimit(1);
const jitsiBroadcastSpaceLogger = debug("JitsiBroadcastSpace");

/**
 * This service is in charge of:
 * - tracking in which broadcast zone the user is
 * - sending this zone to the server
 * - listening for clicks on the broadcast button + listening to people entering the stage
 * - listening for a signal we should join a broadcast
 * - keep track of the Jitsi connection / room and restart it if connection is lost
 */
export class JitsiBroadcastSpace extends EventTarget implements BroadcastSpace {
    private conference: JitsiConferenceWrapper | undefined;
    private unsubscribes: Unsubscriber[] = [];
    private jitsiTracks: ForwardableStore<Map<string, JitsiTrackWrapper>>;
    readonly space: SpaceInterface;
    readonly provider = "jitsi";
    private associatedStreamStoreTimeOut: NodeJS.Timeout | undefined;
    private spaceFilter: SpaceFilterInterface;

    private static numInstances = 0;

    constructor(
        private roomConnection: RoomConnection,
        spaceName: string,
        private broadcastService: BroadcastService,
        private playSound: boolean,
        private spaceRegistry: SpaceRegistryInterface
    ) {
        super();
        JitsiBroadcastSpace.numInstances++;

        this.space = this.spaceRegistry.joinSpace(spaceName);

        this.unsubscribes.push(
            requestedCameraState.subscribe((state) => {
                this.space.emitUpdateUser({
                    cameraState: state,
                });
            })
        );

        this.unsubscribes.push(
            requestedMicrophoneState.subscribe((state) => {
                this.space.emitUpdateUser({
                    microphoneState: state,
                });
            })
        );

        this.unsubscribes.push(
            requestedScreenSharingState.subscribe((state) => {
                this.space.emitUpdateUser({
                    screenSharingState: state,
                });
            })
        );

        this.unsubscribes.push(
            // FIXME: do we need this store in the JitsiBroadcastService?
            liveStreamingEnabledStore.subscribe((state) => {
                this.space.emitUpdateUser({
                    megaphoneState: state,
                });
            })
        );

        this.spaceFilter = this.space.watchLiveStreamingUsers();
        bindMuteEventsToSpace(this.space, this.spaceFilter);

        this.space.setMetadata(new Map([["test", "test"]]));

        this.jitsiTracks = new ForwardableStore<Map<string, JitsiTrackWrapper>>(new Map());

        // When the user leaves the space, we leave the Jitsi conference
        console.warn("JitsiBroadcastSpace => Subscribing to this.spaceFilter.usersStore");
        this.unsubscribes.push(
            this.spaceFilter.usersStore.subscribe((users) => {
                console.log("JitsiBroadcastSpace => Spacefilter usersStore", JitsiBroadcastSpace.numInstances, users);
                if (users.size === 0) {
                    if (this.conference !== undefined) {
                        limit(() => this.conference?.leave("Nobody is streaming anymore ..."))
                            .then(() => {
                                this.conference = undefined;
                            })
                            .catch((e) => {
                                // TODO : Handle the error and retry to leave the conference
                                console.error(e);
                            })
                            .finally(() => {
                                broadcastService.disconnectProvider(this.provider);
                            });
                    }
                } else {
                    limit(async () => {
                        if (this.conference === undefined) {
                            // TODO: this notification is wrong. It should only be displayed on MEGAPHONE (and not
                            // on speaker zones)
                            notificationPlayingStore.playNotification(get(LL).notification.announcement(), "megaphone");
                            this.conference = await this.joinJitsiConference(spaceName);
                            this.space.emitUpdateUser({
                                jitsiParticipantId: this.conference.participantId,
                            });
                        }
                    }).catch((e) => {
                        console.error("Error while joining the conference", e);
                        Sentry.captureException(e);
                    });
                }
            })
        );
    }

    async joinJitsiConference(roomName: string): Promise<JitsiConferenceWrapper> {
        if (!JITSI_DOMAIN || !JITSI_XMPP_DOMAIN || !JITSI_MUC_DOMAIN) {
            throw new Error("Cannot use Jitsi with a no domain defined, please check your environment variables");
        }

        let jitsiConnection = this.broadcastService.getBroadcastConnection(this.provider);

        if (!jitsiConnection) {
            try {
                jitsiConnection = await libJitsiFactory.createConnection(
                    JITSI_DOMAIN,
                    JITSI_XMPP_DOMAIN,
                    JITSI_MUC_DOMAIN
                );
            } catch (e) {
                jitsiBroadcastSpaceLogger("Error while connecting to Jitsi", e);
            }

            if (!jitsiConnection) {
                throw new Error("Could not connect to Jitsi");
            }

            this.broadcastService.setBroadcastConnection(this.provider, jitsiConnection);
        }

        const certifiedJitsiConnection = jitsiConnection as JitsiConnection;

        jitsiBroadcastSpaceLogger("Joining Jitsi conference, jitsiConnection is defined " + roomName);

        const turnCredentialsAnswer = await this.roomConnection.queryTurnCredentials();
        const jitsiConference = await JitsiConferenceWrapper.join(
            certifiedJitsiConnection,
            roomName,
            turnCredentialsAnswer
        );
        jitsiConferencesStore.set(roomName, jitsiConference);

        if (get(liveStreamingEnabledStore)) {
            jitsiConference.broadcast(["video", "audio"]);
        } else if (this.playSound) {
            gameManager.getCurrentGameScene().playSound("audio-megaphone");
        }

        // TODO: change me
        // We need to wait a bit before associating the JitsiTrack with the SpaceUser
        // Because the spaceUser was not updated with new users yet
        // This is a workaround to avoid having to wait for the spaceUser to be updated implemented when we correct the Megaphone feature
        if (this.associatedStreamStoreTimeOut) clearTimeout(this.associatedStreamStoreTimeOut);
        this.associatedStreamStoreTimeOut = setTimeout(() => {
            const associatedStreamStore: Readable<Map<string, JitsiTrackWrapper>> = derived(
                [jitsiConference.streamStore, this.spaceFilter.usersStore],
                ([$streamStore, $users]) => {
                    const filtered = new Map<string, JitsiTrackWrapper>();
                    for (const [participantId, stream] of $streamStore) {
                        let found = false;
                        const spaceUser = stream.getImmediateSpaceUser();
                        if (spaceUser !== undefined) {
                            if ($users.has(spaceUser.spaceUserId)) {
                                filtered.set(participantId, stream);
                            }
                            continue;
                        }
                        for (const user of $users.values()) {
                            if (user.jitsiParticipantId === stream.uniqueId) {
                                stream.setSpaceUser(user);
                                filtered.set(participantId, stream);
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            console.info(
                                "No associated spaceUser found for participantId: ",
                                stream.uniqueId,
                                $users.values()
                            );
                            jitsiBroadcastSpaceLogger(
                                "joinJitsiConference => No associated spaceUser found for participantId: " +
                                    stream.uniqueId
                            );
                        }
                    }
                    return filtered;
                }
            );
            this.jitsiTracks.forward(associatedStreamStore);
        }, 1000);
        return jitsiConference;
    }

    get tracks(): Readable<Map<string, JitsiTrackWrapper>> {
        return this.jitsiTracks;
    }

    destroy() {
        limit(() => this.conference?.leave("I want to leave this space ..."))
            .then(() => {
                this.conference = undefined;
            })
            .catch((e) => {
                console.error(e);
            })
            .finally(() => {
                this.broadcastService.disconnectProvider(this.provider);
            });
        jitsiConferencesStore.delete(this.space.getName());
        //this.space.stopWatching(this.spaceFilter);
        this.unsubscribes.forEach((unsubscribe) => unsubscribe());
        this.spaceRegistry.leaveSpace(this.space);
        console.warn("JitsiBroadcastSpace => Unsubscribing from this.spaceFilter.usersStore");
    }
}
