<script lang="ts">
    import { fly } from "svelte/transition";
    import { onMount } from "svelte";
    import { Notification, notificationPlayingStore } from "../../Stores/NotificationStore";
    import microphoneOffImg from "../images/mic.svg";
    import cameraOffImg from "../images/cam.svg";
    import jistiImg from "../images/jitsi.png";
    import waImg from "../images/icon-workadventure-white.png";
    import AreaToolImg from "../images/icon-tool-area.png";
    import megaphoneImg from "./images/megaphone.svg";

    const icons = new Map<string, string>([
        ["microphone-off.png", microphoneOffImg],
        ["camera-off.png", cameraOffImg],
        ["jitsi.png", jistiImg],
        ["icon-tool-area.png", AreaToolImg],
        ["megaphone", megaphoneImg],
    ]);

    export let notification: Notification;

    onMount(() => {
        // Clear notification after 5 seconds
        setTimeout(() => {
            notificationPlayingStore.removeNotification(notification);
        }, 5000);
    });
</script>

<div class="notification-playing bg-dark-blue/95 mt-1" transition:fly={{ x: 210, duration: 500 }}>
    <img
        src={notification.icon ? icons.get(notification.icon) ?? notification.icon : waImg}
        alt="Audio playing"
        class="bg-medium-purple rounded-full h-14"
    />
    <p>{notification.text}</p>
</div>

<style lang="scss">
    /*audio html when audio message playing*/
    .notification-playing {
        height: 54px;
        right: 0;
        top: 40px;
        transition: all 0.1s ease-out;
        //background-color: black;
        border-radius: 30px 0 0 30px;
        display: inline-flex;
        align-items: center;
        z-index: 750;

        img {
            //border-radius: 50%;
            padding: 10px;
        }

        p {
            color: white;
            margin-left: 10px;
            margin-top: 14px;
            margin-right: 10px;
        }
    }
</style>
