import { get } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import type { Subscription } from "rxjs";
import { FilterType } from "@workadventure/messages";
import type { PrivateEvents, SpaceInterface } from "../SpaceInterface";
import { notificationPlayingStore } from "../../Stores/NotificationStore";
import { isSpeakerStore, requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import { requestedHandRaiseState } from "../../Stores/RaiseHandStore";
import LL from "../../../i18n/i18n-svelte";
import { currentLiveStreamingSpaceStore, givenFloorSpaceStore } from "../../Stores/MegaphoneStore";
import { chatZoneLiveStore } from "../../Stores/ChatStore";
import { gameManager } from "../../Phaser/Game/GameManager";
import { popupStore } from "../../Stores/PopupStore";
import MuteDialogPopup from "../../Components/PopUp/MuteDialogPopup.svelte";

function displayMuteDialog(event: PrivateEvents["muteAudio"] | PrivateEvents["muteVideo"], space: SpaceInterface) {
    const message =
        event.$case === "muteAudio"
            ? get(LL).notification.askToMuteMicrophone()
            : get(LL).notification.askToMuteCamera();

    const popupName = event.$case + "-dialog-popup-" + event.sender;

    const senderUser = get(space.usersStore).get(event.sender);

    let subscription: Subscription | undefined;

    const cleanup = () => {
        popupStore.removePopup(popupName);
        subscription?.unsubscribe();
        currentUserLeaveSpaceSubscription.unsubscribe();
    };

    // In case the sender leaves the space, we remove the popup
    if (senderUser) {
        subscription = space.observeUserLeft.subscribe((user) => {
            if (user.spaceUserId === event.sender) {
                cleanup();
            }
        });
    }

    const currentUserLeaveSpaceSubscription = space.onLeaveSpace.subscribe(() => {
        cleanup();
    });

    popupStore.addPopup(
        MuteDialogPopup,
        {
            message,
            sender: senderUser,
            acceptRequest: () => {
                if (event.$case === "muteAudio") {
                    requestedMicrophoneState.disableMicrophone();
                } else {
                    requestedCameraState.disableWebcam();
                }
                cleanup();
            },
            refuseRequest: () => {
                cleanup();
            },
        },
        popupName,
    );
}

/**
 * This function listens to the space events and mutes the user when a mute request is received.
 */
export function bindMuteEventsToSpace(space: SpaceInterface): void {
    // We can safely ignore the subscription because it will be automatically completed when the space is destroyed.
    // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
    space.observePrivateEvent("muteAudio").subscribe((event) => {
        if (event.muteAudio.force) {
            notificationPlayingStore.playNotification(get(LL).notification.microphoneMuted(), "microphone-off.png");
            requestedMicrophoneState.disableMicrophone();
        } else {
            notificationPlayingStore.playNotification(get(LL).notification.askToMuteMicrophone(), "microphone-off.png");
            displayMuteDialog({ ...event, sender: event.sender.spaceUserId }, space);
        }
    });

    // We can safely ignore the subscription because it will be automatically completed when the space is destroyed.
    // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
    space.observePrivateEvent("muteVideo").subscribe((event) => {
        if (event.muteVideo.force) {
            notificationPlayingStore.playNotification(get(LL).notification.cameraMuted(), "camera-off.png");
            requestedCameraState.disableWebcam();
        } else {
            notificationPlayingStore.playNotification(get(LL).notification.askToMuteCamera(), "camera-off.png");
            displayMuteDialog({ ...event, sender: event.sender.spaceUserId }, space);
        }
    });

    // Observe private event to ckick the user of the space and proximity discussion
    // We can safely ignore the subscription because it will be automatically completed when the space is destroyed.
    // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
    space.observePrivateEvent("kickOffUser").subscribe((event) => {
        isSpeakerStore.set(false);
        currentLiveStreamingSpaceStore.set(undefined);

        const scene = gameManager.getCurrentGameScene();
        const spaceRegistry = scene.spaceRegistry;
        spaceRegistry.leaveSpace(space).catch((e) => {
            console.error("Error while leaving space", e);
            Sentry.captureException(e);
        });
        chatZoneLiveStore.set(false);
    });

    // The local user has been given the floor: promote to speaker (in megaphone spaces) and lower the raised hand.
    // We can safely ignore the subscription because it will be automatically completed when the space is destroyed.
    // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
    space.observePrivateEvent("giveFloor").subscribe(() => {
        // In an ALL_USERS (proximity) space everyone already speaks, so there is nothing to promote.
        if (space.filterType !== FilterType.ALL_USERS) {
            space.startStreaming();
            // Promote to a full speaker: this guarantees the local return feed (self-view) shows even when the
            // user's availability status would otherwise hide it, and remembers the space so we can offer a
            // "give back the floor" control (see GiveBackFloorMenuItem).
            isSpeakerStore.set(true);
            givenFloorSpaceStore.set(space);
        }
        requestedHandRaiseState.lowerHand();
        // We never force the microphone on; if it is muted we invite the user to enable it.
        if (get(requestedMicrophoneState)) {
            notificationPlayingStore.playNotification(get(LL).notification.givenTheFloor());
        } else {
            notificationPlayingStore.playNotification(get(LL).notification.givenTheFloorEnableMicrophone());
        }
    });

    // The floor has been taken back from the local user: demote from speaker (in megaphone spaces).
    // We can safely ignore the subscription because it will be automatically completed when the space is destroyed.
    // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
    space.observePrivateEvent("revokeFloor").subscribe(() => {
        if (space.filterType !== FilterType.ALL_USERS) {
            space.stopStreaming();
            // Undo the promotion only if we got the floor via a raised hand (not for a megaphone/zone speaker
            // whose speaker state is owned by the zone listeners).
            if (get(givenFloorSpaceStore) === space) {
                isSpeakerStore.set(false);
                givenFloorSpaceStore.set(undefined);
            }
        }
        notificationPlayingStore.playNotification(get(LL).notification.floorRevoked(), "microphone-off.png");
    });

    // If the local user leaves the space while holding a floor granted through a raised hand, drop the
    // promotion state so the "give back the floor" control does not linger, pointing at a space we left.
    // We can safely ignore the subscription because it will be automatically completed when the space is destroyed.
    // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
    space.onLeaveSpace.subscribe(() => {
        if (get(givenFloorSpaceStore) === space) {
            isSpeakerStore.set(false);
            givenFloorSpaceStore.set(undefined);
        }
    });

    // We can safely ignore the subscription because it will be automatically completed when the space is destroyed.
    // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
    space.observePublicEvent("muteAudioForEverybody").subscribe((event) => {
        notificationPlayingStore.playNotification(get(LL).notification.askToMuteMicrophone(), "microphone-off.png");
        requestedMicrophoneState.disableMicrophone();
    });

    // We can safely ignore the subscription because it will be automatically completed when the space is destroyed.
    // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
    space.observePublicEvent("muteVideoForEverybody").subscribe((event) => {
        notificationPlayingStore.playNotification(get(LL).notification.askToMuteCamera(), "camera-off.png");
        requestedCameraState.disableWebcam();
    });
}
