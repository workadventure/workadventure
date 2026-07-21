<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import PopUpConnect from "./PopUpConnect.svelte";

    const { Story } = defineMeta({
        title: "Feedback/PopUp/Connect",
        component: PopUpConnect,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".popup-container")).toBeInTheDocument();
        await expect(canvasElement.querySelector(".btn")).toBeInTheDocument();
    }}
/>
