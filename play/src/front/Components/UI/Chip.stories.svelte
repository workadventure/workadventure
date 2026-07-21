<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import Chip from "./Chip.svelte";

    const { Story } = defineMeta({
        title: "Design System/Chip",
        component: Chip,
        tags: ["autodocs"],
        argTypes: {
            size: {
                control: { type: "select" },
                options: ["xs", "sm"],
            },
            display: {
                control: { type: "select" },
                options: ["inline", "inline-flex"],
            },
        },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelectorAll(".chip")).toHaveLength(1);
        await expect(canvasElement.querySelector(".chip")).toHaveClass("chip-sm");
    }}
>
    Label
</Story>

<Story
    name="ExtraSmall"
    args={{ size: "xs" }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".chip")).toHaveClass("chip-xs");
    }}
>
    Label
</Story>
