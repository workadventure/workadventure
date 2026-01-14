import debug from "debug";
import { slugify } from "@workadventure/shared-utils/src/Jitsi/slugify";
import { FilterType } from "@workadventure/messages";
import { get } from "svelte/store";
import type { Subscription } from "rxjs";
import type { SpaceInterface } from "../Space/SpaceInterface";
import type { SpaceRegistryInterface } from "../Space/SpaceRegistry/SpaceRegistryInterface";
import { notificationPlayingStore } from "../Stores/NotificationStore";
import LL from "../../i18n/i18n-svelte";
import { gameManager } from "../Phaser/Game/GameManager";

const broadcastServiceLogger = debug("BroadcastService");

export class BroadcastService {
    private broadcastSpaces: SpaceInterface[] = [];
    private unsubscribes: Subscription[] = [];

    constructor(private spaceRegistry: SpaceRegistryInterface) {}

    /**
     * Join a broadcast space
     * @param spaceName The name of the space to join
     * @param abortSignal Signal to abort the join operation
     * @param audienceVideoFeedbackActivated If true, use LIVE_STREAMING_USERS_WITH_FEEDBACK to allow speaker to see attendees
     * @returns The broadcast space
     */
    public async joinSpace(
        spaceName: string,
        abortSignal: AbortSignal,
        audienceVideoFeedbackActivated = false
    ): Promise<SpaceInterface> {
        const spaceNameSlugify = slugify(spaceName);

        const filterType = audienceVideoFeedbackActivated
            ? FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK
            : FilterType.LIVE_STREAMING_USERS;

        const watchFields = audienceVideoFeedbackActivated
            ? ["screenSharing", "cameraState", "microphoneState", "megaphoneState", "cameraFeedbackState"]
            : ["screenSharing", "cameraState", "microphoneState", "megaphoneState"];

        const space = await this.spaceRegistry.joinSpace(spaceNameSlugify, filterType, watchFields, abortSignal);

        this.unsubscribes.push(
            space.observeUserJoined.subscribe((user) => {
                if (user.megaphoneState) {
                    notificationPlayingStore.playNotification(get(LL).notification.announcement(), "megaphone");
                    gameManager.getCurrentGameScene().playSound("audio-megaphone");
                    if (filterType === FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK) {
                        // // Start listener streaming only if this is the first speaker
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
                if (filterType === FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK) {
                    // // Stop listener streaming only if there are no more speakers
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
}
