<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import CustomSubMenu from "./CustomSubMenu.svelte";

    const { Story } = defineMeta({
        title: "Feature/Menu/Custom Sub Menu",
        component: CustomSubMenu,
        tags: ["autodocs"],
        args: {
            url: "https://workadventu.re",
            allowApi: false,
            allow: undefined,
        },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        const iframe = canvasElement.querySelector("iframe[title='customSubMenu']");
        await expect(iframe).toBeInTheDocument();
        await expect(iframe).toHaveAttribute("src", "https://workadventu.re");
    }}
/>
