<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import BrowserNoSoundInfoToast from "./BrowserNoSoundInfoToast.svelte";

    // Renders unconditionally (no props, no store gating). It imports the audio-playback and
    // user-activation stores, but only reads them on interaction — so with the preview shell
    // (window.env + i18n) in place, it stories with no setup at all.
    const { Story } = defineMeta({
        title: "Feedback/Browser No Sound Info Toast",
        component: BrowserNoSoundInfoToast,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector("[data-testid=audio-playback-retry]")).toBeInTheDocument();
    }}
/>
