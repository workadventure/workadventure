import debug from "debug";
import { slugify } from "@workadventure/shared-utils/src/Jitsi/slugify";
import { FilterType } from "@workadventure/messages";
import { get, type Unsubscriber } from "svelte/store";
import type { Subscription } from "rxjs";
import { type WAMSettings, WAMSettingsUtils } from "@workadventure/map-editor";

import * as Sentry from "@sentry/svelte";
import type { SpaceInterface } from "../Space/SpaceInterface";
import type { SpaceRegistryInterface } from "../Space/SpaceRegistry/SpaceRegistryInterface";
import { notificationPlayingStore } from "../Stores/NotificationStore";
import LL from "../../i18n/i18n-svelte";
import { gameManager } from "../Phaser/Game/GameManager";
import { localUserStore } from "../Connection/LocalUserStore";
import { soundManager } from "../Phaser/Game/SoundManager";
import { statusChanger } from "../Components/ActionBar/AvailabilityStatus/statusChanger";
import { megaphoneSpaceSettingsStore, megaphoneSpaceStore } from "../Stores/MegaphoneStore";
import { resolveUrlPlaceholders } from "../Utils/UrlPlaceholderResolver";

const broadcastServiceLogger = debug("BroadcastService");
const DEFAULT_MEGAPHONE_NOTIFICATION_SOUND_URL = "/resources/objects/megaphone/megaphone1.mp3";

export class BroadcastService {
    private broadcastSpaces: SpaceInterface[] = [];
    private unsubscribes: Subscription[] = [];
    private megaphoneSpaceSettingsStoreUnsubscribe: Unsubscriber;

    constructor(
        private spaceRegistry: SpaceRegistryInterface,
        private wamSettings: WAMSettings | undefined,
        private tags: string[],
        private abortSignal: AbortSignal
    ) {
        // Listen for changes in WAM settings to update the recording capability in existing spaces
        this.megaphoneSpaceSettingsStoreUnsubscribe = megaphoneSpaceSettingsStore.subscribe((newSpaceSettings) => {
            const oldMegaphoneSpace = get(megaphoneSpaceStore);

            // Handle existing megaphone space
            if (oldMegaphoneSpace) {
                // Leave the old space
                this.spaceRegistry.leaveSpace(oldMegaphoneSpace).catch((e) => {
                    console.error("Error while leaving space", e);
                    Sentry.captureException(e);
                });
            }

            if (newSpaceSettings !== undefined) {
                const spaceName = slugify(newSpaceSettings?.spaceName);
                const audienceVideoFeedbackActivated = newSpaceSettings.audienceVideoFeedbackActivated;
                this.joinSpace(
                    spaceName,
                    this.abortSignal,
                    audienceVideoFeedbackActivated,
                    new Map([["isMegaphoneSpace", true]])
                )
                    .then((space) => {
                        megaphoneSpaceStore.set(space);
                    })
                    .catch((e) => {
                        console.error(e);
                        Sentry.captureException(e);
                    });
            }
        });
    }

    /**
     * Join a broadcast space
     * @param spaceName The name of the space to join
     * @param abortSignal Signal to abort the join operation
     * @param audienceVideoFeedbackActivated If true, use LIVE_STREAMING_USERS_WITH_FEEDBACK to allow speaker to see attendees
     * @param metadata Optional metadata to set when joining the space
     * @returns The broadcast space
     */
    public async joinSpace(
        spaceName: string,
        abortSignal: AbortSignal,
        audienceVideoFeedbackActivated = false,
        metadata: Map<string, unknown> = new Map()
    ): Promise<SpaceInterface> {
        const spaceNameSlugify = slugify(spaceName);

        const filterType = audienceVideoFeedbackActivated
            ? FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK
            : FilterType.LIVE_STREAMING_USERS;

        const watchFields = audienceVideoFeedbackActivated
            ? ["screenSharing", "cameraState", "microphoneState", "megaphoneState", "attendeesState"]
            : ["screenSharing", "cameraState", "microphoneState", "megaphoneState"];

        const space = await this.spaceRegistry.joinSpace(spaceNameSlugify, filterType, watchFields, abortSignal, {
            canRecord: WAMSettingsUtils.canStartRecordingMegaphone(
                this.wamSettings,
                this.tags,
                localUserStore.isLogged()
            ),
            metadata,
        });

        // Check for existing speakers when joining the space
        // This handles the case where a listener joins after speakers are already present
        if (filterType === FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK) {
            const existingSpeakersCount = this.countSpeakers(space);
            if (existingSpeakersCount > 0) {
                space.startListenerStreaming();
            }
        }

        this.unsubscribes.push(
            space.observeUserJoined.subscribe((user) => {
                if (user.megaphoneState) {
                    notificationPlayingStore.playNotification(get(LL).notification.announcement(), "megaphone");
                    this.playMegaphoneNotificationSound().catch((e) => console.error(e));
                    if (filterType === FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK) {
                        // Start listener streaming only if this is the first speaker
                        const speakersCount = this.countSpeakers(space);
                        if (speakersCount === 1) {
                            space.startListenerStreaming();
                        }
                    }
                }
            })
        );

        this.unsubscribes.push(
            space.observeUserLeft.subscribe((user) => {
                // Only react when a speaker leaves, not when a listener leaves
                if (filterType === FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK && user.megaphoneState) {
                    // Stop listener streaming only if there are no more speakers
                    const speakersCount = this.countSpeakers(space);
                    if (speakersCount === 0) {
                        space.stopListenerStreaming();
                    }
                }
            })
        );

        this.broadcastSpaces.push(space);

        broadcastServiceLogger("joinSpace", spaceNameSlugify);

        return space;
    }

    /**
     * Leave a broadcast space
     * @param spaceName The name of the space to leave
     */
    public async leaveSpace(spaceName: string) {
        const spaceNameSlugify = slugify(spaceName);
        const space = this.broadcastSpaces.find((space) => space.getName() === spaceNameSlugify);

        if (space) {
            //await space.destroy();
            await this.spaceRegistry.leaveSpace(space);
            this.broadcastSpaces = this.broadcastSpaces.filter((space) => space.getName() !== spaceNameSlugify);
            broadcastServiceLogger("leaveSpace", spaceNameSlugify);
            return;
        }
    }

    /**
     * Destroy the broadcast service
     */
    public async destroy(): Promise<void> {
        this.unsubscribes.forEach((unsubscribe) => unsubscribe.unsubscribe());
        this.megaphoneSpaceSettingsStoreUnsubscribe();
        await Promise.all(this.broadcastSpaces.map((space) => this.spaceRegistry.leaveSpace(space)));
    }

    /**
     * Count the number of users with megaphoneState = true (speakers) in the space
     */
    private countSpeakers(space: SpaceInterface): number {
        const users = get(space.usersStore);
        let count = 0;
        for (const user of users.values()) {
            if (user.megaphoneState) {
                count++;
            }
        }
        return count;
    }

    private async playMegaphoneNotificationSound(): Promise<void> {
        if (!statusChanger.allowNotificationSound()) {
            return;
        }
        const enableSoundNotifications = this.wamSettings?.megaphone?.enableSoundNotifications ?? true;
        if (!enableSoundNotifications) {
            return;
        }
        const notificationSoundUrl =
            this.wamSettings?.megaphone?.notificationSoundUrl ?? DEFAULT_MEGAPHONE_NOTIFICATION_SOUND_URL;
        const scene = gameManager.getCurrentGameScene();
        const soundUrl = resolveUrlPlaceholders(notificationSoundUrl);
        if (!soundUrl) {
            return;
        }
        await soundManager.playSound(scene.load, scene.sound, soundUrl, { volume: 0.2 });
    }
}
