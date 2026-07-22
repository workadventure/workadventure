<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import BrowserNotSupported from "./BrowserNotSupported.svelte";

    const { Story } = defineMeta({
        title: "Feedback/Browser Not Supported",
        component: BrowserNotSupported,
        tags: ["autodocs"],
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector("[data-testid='update-browser-button']")).toBeInTheDocument();
        await expect(canvasElement.querySelector("[data-testid='leave-button']")).toBeInTheDocument();
    }}
/>
