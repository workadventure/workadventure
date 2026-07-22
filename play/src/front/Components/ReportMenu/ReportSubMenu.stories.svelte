<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import ReportSubMenu from "./ReportSubMenu.svelte";

    const { Story } = defineMeta({
        title: "Feature/Report/Report Sub Menu",
        component: ReportSubMenu,
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
        await expect(canvasElement.querySelector(".blue-title")).toBeInTheDocument();
        await expect(canvasElement.querySelector("textarea")).toBeInTheDocument();
        await expect(canvasElement.querySelector("button[type='submit']")).toBeInTheDocument();
    }}
/>
