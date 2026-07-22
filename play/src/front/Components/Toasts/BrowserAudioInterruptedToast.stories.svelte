<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import BrowserAudioInterruptedToast from "./BrowserAudioInterruptedToast.svelte";

    const { Story } = defineMeta({
        title: "Feedback/Browser Audio Interrupted Toast",
        component: BrowserAudioInterruptedToast,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector("p")).toBeInTheDocument();
    }}
/>
