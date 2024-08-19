import { get } from "svelte/store";
import { SpaceInterface } from "../SpaceInterface";
import { notificationPlayingStore } from "../../Stores/NotificationStore";
import { isSpeakerStore, requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import LL from "../../../i18n/i18n-svelte";
import { askDialogStore } from "../../Stores/MeetingStore";
import { currentLiveStreamingSpaceStore } from "../../Stores/MegaphoneStore";
import { chatZoneLiveStore } from "../../Stores/ChatStore";

/**
 * This function listens to the space events and mutes the user when a mute request is received.
 */
export function bindMuteEventsToSpace(space: SpaceInterface) {
    // We can safely ignore the subscription because it will be automatically completed when the space is destroyed.
    // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
    space.observePrivateEvent("muteAudio").subscribe((event) => {
        notificationPlayingStore.playNotification(get(LL).notification.askToMuteMicrophone(), "microphone-off.png");
        if (event.muteAudio.force) {
            requestedMicrophoneState.disableMicrophone();
        } else {
            askDialogStore.addAskDialog(event.sender, get(LL).notification.askToMuteMicrophone(), () => {
                requestedMicrophoneState.disableMicrophone();
            });
        }
    });

    // We can safely ignore the subscription because it will be automatically completed when the space is destroyed.
    // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
    space.observePrivateEvent("muteVideo").subscribe((event) => {
        notificationPlayingStore.playNotification(get(LL).notification.askToMuteCamera(), "camera-off.png");
        if (event.muteVideo.force) {
            requestedCameraState.disableWebcam();
        } else {
            askDialogStore.addAskDialog(event.sender, get(LL).notification.askToMuteCamera(), () => {
                requestedCameraState.disableWebcam();
            });
        }
    });

    // We can safely ignore the subscription because it will be automatically completed when the space is destroyed.
    // eslint-disable-next-line rxjs/no-ignored-subscription,svelte/no-ignored-unsubscribe
    space.observePrivateEvent("kickOffUser").subscribe((event) => {
        // FIXME: kick off should probably kick the user of the world, right???
        // In this case, maybe kickoff does not belong to a space but is a more generic message???
        isSpeakerStore.set(false);
        currentLiveStreamingSpaceStore.set(undefined);
        //const scene = gameManager.getCurrentGameScene();

        //scene.broadcastService.leaveSpace(subMessage.kickOffMessage.spaceName);

        chatZoneLiveStore.set(false);
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
