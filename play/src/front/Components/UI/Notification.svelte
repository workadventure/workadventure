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

<div
    class="notification-playing bg-contrast/80 p-1 backdrop-blur rounded-lg mr-2"
    transition:fly={{ x: 210, duration: 500 }}
>
    <img
        src={notification.icon ? icons.get(notification.icon) ?? notification.icon : waImg}
        alt="Audio playing"
        class="bg-white/10 rounded-md h-12"
    />
    <p>{notification.text}</p>
</div>

<style lang="scss">
    /*audio html when audio message playing*/
    .notification-playing {
        top: 40px;
        transition: all 0.1s ease-out;
        //background-color: black;
        display: inline-flex;
        align-items: center;
        z-index: 750;

        img {
            //border-radius: 50%;
            padding: 5px;
        }

        p {
            color: white;
            margin-left: 10px;
            margin-top: 14px;
            margin-right: 10px;
        }
    }
</style>
