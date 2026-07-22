<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import Search from "./Search.svelte";

    const { Story } = defineMeta({
        title: "Forms/Search",
        component: Search,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
        args: { placeHolder: "Search people" },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        const input = canvasElement.querySelector("input[name='search-input']");
        await expect(input).toBeInTheDocument();
        await expect(input).toHaveAttribute("placeholder", "Search people");
    }}
/>
