<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import NoMicrophoneSoundToast from "./NoMicrophoneSoundToast.svelte";

    // Imports several media/menu stores but reads them only in its handlers, so it stories from a
    // plain fixture (just the required toastUuid).
    const { Story } = defineMeta({
        title: "Feedback/No Microphone Sound Toast",
        component: NoMicrophoneSoundToast,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
        args: {
            toastUuid: "demo-no-microphone-sound",
        },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        const button = canvasElement.querySelector("[data-testid=no-microphone-sound-open-settings]");
        await expect(button).toBeInTheDocument();
    }}
/>
