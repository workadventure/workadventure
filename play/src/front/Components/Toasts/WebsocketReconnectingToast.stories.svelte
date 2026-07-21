<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import WebsocketReconnectingToast from "./WebsocketReconnectingToast.svelte";

    const { Story } = defineMeta({
        title: "Feedback/Websocket Reconnecting Toast",
        component: WebsocketReconnectingToast,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector("[data-testid=websocket-reconnecting-toast]")).toBeInTheDocument();
    }}
/>
