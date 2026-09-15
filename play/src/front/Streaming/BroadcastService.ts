import debug from "debug";
import { slugify } from "@workadventure/shared-utils/src/Jitsi/slugify";
import { FilterType } from "@workadventure/messages";
import { get, type Unsubscriber } from "svelte/store";
import { Subscription } from "rxjs";
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
import type { MegaphoneSpaceSettings } from "../Stores/MegaphoneStore";
import { resolveUrlPlaceholders } from "../Utils/UrlPlaceholderResolver";
import { getMegaphoneSpaceFields } from "./MegaphoneSpaceFields";

const broadcastServiceLogger = debug("BroadcastService");
const DEFAULT_MEGAPHONE_NOTIFICATION_SOUND_URL = "/resources/objects/megaphone/megaphone1.mp3";

export class BroadcastService {
    private broadcastSpaces: SpaceInterface[] = [];
    private unsubscribes: Subscription[] = [];
    private megaphoneSpaceSettingsStoreUnsubscribe: Unsubscriber;
    private megaphoneSpaceSettings: MegaphoneSpaceSettings | undefined;

    constructor(
        private spaceRegistry: SpaceRegistryInterface,
        private wamSettings: WAMSettings | undefined,
        private tags: string[],
        private abortSignal: AbortSignal,
    ) {
        // Listen for changes in WAM settings to update the recording capability in existing spaces
        this.megaphoneSpaceSettingsStoreUnsubscribe = megaphoneSpaceSettingsStore.subscribe((newSpaceSettings) => {
            const oldMegaphoneSpace = get(megaphoneSpaceStore);
            const oldSpaceSettings = this.megaphoneSpaceSettings;

            if (oldMegaphoneSpace) {
                oldMegaphoneSpace.setCanRecord(newSpaceSettings?.canRecord ?? false);
            }

            if (
                oldMegaphoneSpace &&
                newSpaceSettings !== undefined &&
                oldSpaceSettings?.spaceName === newSpaceSettings.spaceName &&
                oldSpaceSettings.audienceVideoFeedbackActivated === newSpaceSettings.audienceVideoFeedbackActivated
            ) {
                this.megaphoneSpaceSettings = newSpaceSettings;
                return;
            }

            // Handle existing megaphone space
            if (oldMegaphoneSpace) {
                // Leave the old space
                this.spaceRegistry.leaveSpace(oldMegaphoneSpace).catch((e) => {
                    console.error("Error while leaving space", e);
                    Sentry.captureException(e);
                });
            }

            if (newSpaceSettings !== undefined) {
                const spaceName = newSpaceSettings.spaceName;
                const audienceVideoFeedbackActivated = newSpaceSettings.audienceVideoFeedbackActivated;
                this.megaphoneSpaceSettings = newSpaceSettings;
                this.joinSpace(
                    spaceName,
                    this.abortSignal,
                    audienceVideoFeedbackActivated,
                    new Map([["isMegaphoneSpace", true]]),
                    newSpaceSettings.canRecord,
                )
                    .then((space) => {
                        megaphoneSpaceStore.set(space);
                    })
                    .catch((e) => {
                        console.error(e);
                        // Comment this out to avoid spamming Sentry with errors when joining spaces
                        // Sentry.captureException(e);
                    });
            } else {
                this.megaphoneSpaceSettings = undefined;
                megaphoneSpaceStore.set(undefined);
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
        metadata: Map<string, unknown> = new Map(),
        canRecord = WAMSettingsUtils.canStartRecordingMegaphone(this.wamSettings, this.tags, localUserStore.isLogged()),
    ): Promise<SpaceInterface> {
        const spaceNameSlugify = slugify(spaceName);

        const filterType = audienceVideoFeedbackActivated
            ? FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK
            : FilterType.LIVE_STREAMING_USERS;

        const space = await this.spaceRegistry.joinSpace(
            spaceNameSlugify,
            filterType,
            getMegaphoneSpaceFields(audienceVideoFeedbackActivated),
            abortSignal,
            {
                canRecord,
                metadata,
            },
        );

        this.unsubscribes.push(
            space.observeUserJoined.subscribe((user) => {
                if (user.megaphoneState) {
                    notificationPlayingStore.playNotification(get(LL).notification.announcement(), "megaphone");
                    this.playMegaphoneNotificationSound().catch((e) => console.error(e));
                }
            }),
        );

        // The audience only publishes while there is someone to publish to. The store carries
        // its current value on subscribe, so a listener who joins after the speakers is covered
        // by the same code path as one who was there first.
        if (filterType === FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK) {
            let listenerStreaming = false;
            this.unsubscribes.push(
                new Subscription(
                    space.hasRemoteSpeakerStore.subscribe((hasSpeaker) => {
                        if (hasSpeaker === listenerStreaming) {
                            return;
                        }
                        listenerStreaming = hasSpeaker;

                        if (hasSpeaker) {
                            space.startListenerStreaming();
                        } else {
                            space.stopListenerStreaming();
                        }
                    }),
                ),
            );
        }

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
