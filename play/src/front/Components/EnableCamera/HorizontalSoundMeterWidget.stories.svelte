<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import HorizontalSoundMeterWidget from "./HorizontalSoundMeterWidget.svelte";

    const { Story } = defineMeta({
        title: "Feature/Sound Meter (horizontal)",
        component: HorizontalSoundMeterWidget,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
    });
</script>

<Story
    name="Silent"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".horizontal-sound-meter")).toBeInTheDocument();
    }}
/>

<Story
    name="Active"
    args={{ spectrum: [20, 60, 100, 140, 100, 60, 20] }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".horizontal-sound-meter")).toBeInTheDocument();
    }}
/>
