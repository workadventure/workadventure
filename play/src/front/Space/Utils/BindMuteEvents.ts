import { get } from "svelte/store";
import { Subscription } from "rxjs";
import { PrivateEvents, SpaceInterface } from "../SpaceInterface";
import { notificationPlayingStore } from "../../Stores/NotificationStore";
import { isSpeakerStore, requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import LL from "../../../i18n/i18n-svelte";
import { currentLiveStreamingSpaceStore } from "../../Stores/MegaphoneStore";
import { chatZoneLiveStore } from "../../Stores/ChatStore";
import { gameManager } from "../../Phaser/Game/GameManager";
import { peerStore } from "../../Stores/PeerStore";
import { SpaceFilterInterface } from "../SpaceFilter/SpaceFilter";
import { popupStore } from "../../Stores/PopupStore";
import MuteDialogPopup from "../../Components/PopUp/MuteDialogPopup.svelte";

function displayMuteDialog(
    event: PrivateEvents["muteAudio"] | PrivateEvents["muteVideo"],
    space: SpaceInterface,
    spaceFilter: SpaceFilterInterface
) {
    const message =
        event.$case === "muteAudio"
            ? get(LL).notification.askToMuteMicrophone()
            : get(LL).notification.askToMuteCamera();

    const popupName = event.$case + "-dialog-popup-" + event.sender;

    const senderUser = get(spaceFilter.usersStore).get(event.sender);

    let subscription: Subscription | undefined;

    const cleanup = () => {
        popupStore.removePopup(popupName);
        subscription?.unsubscribe();
        currentUserLeaveSpaceSubscription.unsubscribe();
    };

    // In case the sender leaves the space, we remove the popup
    if (senderUser) {
        subscription = spaceFilter.observeUserLeft.subscribe((user) => {
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
export function bindMuteEventsToSpace(space: SpaceInterface, spaceFilter: SpaceFilterInterface): void {
    // We can safely ignore the subscription because it will be automatically completed when the space is destroyed.
    // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
    space.observePrivateEvent("muteAudio").subscribe((event) => {
        if (event.muteAudio.force) {
            notificationPlayingStore.playNotification(get(LL).notification.microphoneMuted(), "microphone-off.png");
            requestedMicrophoneState.disableMicrophone();
        } else {
            notificationPlayingStore.playNotification(get(LL).notification.askToMuteMicrophone(), "microphone-off.png");
            displayMuteDialog(event, space, spaceFilter);
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
            displayMuteDialog(event, space, spaceFilter);
        }
    });

    // Observe private event to ckick the user of the space and proximity discussion
    // We can safely ignore the subscription because it will be automatically completed when the space is destroyed.
    // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
    space.observePrivateEvent("kickOffUser").subscribe((event) => {
        isSpeakerStore.set(false);
        currentLiveStreamingSpaceStore.set(undefined);
        const scene = gameManager.getCurrentGameScene();
        scene.broadcastService.leaveSpace(event.spaceName);
        chatZoneLiveStore.set(false);
        // Close all connection simple peer
        scene.getSimplePeer().closeAllConnections();
        peerStore.cleanupStore();
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
