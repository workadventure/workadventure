<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import HelpTooltip from "./HelpTooltip.svelte";

    const { Story } = defineMeta({
        title: "Feature/Help Tooltip",
        component: HelpTooltip,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
        args: {
            title: "Navigate to people",
            desc: "Search for a participant and walk to them automatically.",
            hasImage: false,
            shortcuts: [],
        },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement).toHaveTextContent("Navigate to people");
    }}
/>

<Story
    name="WithShortcuts"
    args={{ shortcuts: ["ctrl", "K"] }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement).toHaveTextContent("Navigate to people");
    }}
/>
