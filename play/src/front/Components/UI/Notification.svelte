<script lang="ts">
    import { fly } from "svelte/transition";
    import { onMount } from "svelte";
    import { Notification, notificationPlayingStore } from "../../Stores/NotificationStore";

    export let notification: Notification;

    onMount(() => {
        // Clear notification after 5 seconds
        setTimeout(() => {
            notificationPlayingStore.removeNotification(notification);
        }, 5000);
    });
</script>

<div class="notification-playing tw-bg-dark-blue/95 tw-mt-1" transition:fly={{ x: 210, duration: 500 }}>
    <img
        src={`/src/front/Components/images/${notification.icon}`}
        alt="Audio playing"
        class="tw-bg-medium-purple tw-rounded-full tw-h-14"
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
