<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import ConnectionIssueToast from "./ConnectionIssueToast.svelte";

    const { Story } = defineMeta({
        title: "Feedback/Connection Issue Toast",
        component: ConnectionIssueToast,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        // Renders the network-off icon (unplugin-icons -> <svg>) plus the retry message.
        await expect(canvasElement.querySelector("svg")).toBeInTheDocument();
    }}
/>
