<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import { readable } from "svelte/store";
    import type { ProximityNotification as ProximityNotificationData } from "../../Stores/ProximityNotificationStore";
    import ProximityNotification from "./ProximityNotification.svelte";

    // ProximityNotification imports several chat stores, yet its render is entirely prop-driven.
    // With the preview shell in place (window.env + i18n), it stories from a plain fixture — no
    // store setup needed. `room.type` / `room.name` are read as stores, so they are readables here.
    const notification = {
        id: "proximity-1",
        userName: "Alice",
        message: "Are you joining the standup in a minute?",
        room: {
            id: "room-general",
            type: readable("multiple"),
            name: readable("General"),
            setTimelineAsRead: () => {},
        },
    } as unknown as ProximityNotificationData;

    const { Story } = defineMeta({
        title: "Feedback/Proximity Notification",
        component: ProximityNotification,
        tags: ["autodocs"],
    });
</script>

<Story
    name="InAGroupRoom"
    args={{ notification }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".proximity-notification")).toBeInTheDocument();
        const message = canvasElement.querySelector("[data-testid=proximity-notification-message]");
        await expect(message).toHaveTextContent("Are you joining the standup in a minute?");
    }}
/>
