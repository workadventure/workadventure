<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import ContactSubMenu from "./ContactSubMenu.svelte";

    const { Story } = defineMeta({
        title: "Feature/Menu/Contact Sub Menu",
        component: ContactSubMenu,
        tags: ["autodocs"],
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".blue-title")).toBeInTheDocument();
    }}
/>
