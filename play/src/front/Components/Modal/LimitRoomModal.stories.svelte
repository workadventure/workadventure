<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import LimitRoomModal from "./LimitRoomModal.svelte";

    const { Story } = defineMeta({
        title: "Feedback/Limit Room Modal",
        component: LimitRoomModal,
        tags: ["autodocs"],
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".limit-map")).toBeInTheDocument();
        await expect(canvasElement).toHaveTextContent("Limit of your room");
    }}
/>
