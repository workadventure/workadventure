import { get } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import { Subscription } from "rxjs";
import { PrivateEvents, SpaceInterface } from "../SpaceInterface";
import { notificationPlayingStore } from "../../Stores/NotificationStore";
import { isSpeakerStore, requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import LL from "../../../i18n/i18n-svelte";
import { currentLiveStreamingSpaceStore } from "../../Stores/MegaphoneStore";
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
        popupName
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
        scene.broadcastService.leaveSpace(event.spaceName).catch((e) => {
            console.error("Error while leaving space", e);
            Sentry.captureException(e);
        });
        chatZoneLiveStore.set(false);
        // Close all connection simple peer
        const simplePeer = space.simplePeer;
        if (simplePeer) {
            simplePeer.closeAllConnections(true);
            simplePeer.cleanupStore();
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
