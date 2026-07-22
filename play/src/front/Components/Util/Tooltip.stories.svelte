<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import Tooltip from "./Tooltip.svelte";

    const { Story } = defineMeta({
        title: "Feature/Tooltip",
        component: Tooltip,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
        args: { text: "Go to the map editor" },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement).toHaveTextContent("Go to the map editor");
    }}
/>
