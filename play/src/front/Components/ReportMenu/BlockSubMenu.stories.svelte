<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import BlockSubMenu from "./BlockSubMenu.svelte";

    const { Story } = defineMeta({
        title: "Feature/Report/Block Sub Menu",
        component: BlockSubMenu,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
        args: {
            userUUID: "user-123",
            userName: "Alice",
        },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector("[data-testid='blockmenu-block-user-button']")).toBeInTheDocument();
        await expect(canvasElement).toHaveTextContent("Alice");
    }}
/>
