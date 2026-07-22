<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import FollowButton from "./FollowButton.svelte";

    const { Story } = defineMeta({
        title: "Feature/Follow Button",
        component: FollowButton,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
        args: { hidden: false },
    });
</script>

<Story
    name="Visible"
    play={async ({ canvasElement }) => {
        const button = canvasElement.querySelector(".btn-follow");
        await expect(button).toBeInTheDocument();
        await expect(button).not.toHaveClass("hide");
    }}
/>

<Story
    name="Hidden"
    args={{ hidden: true }}
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".btn-follow")).toHaveClass("hide");
    }}
/>
