<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import { withContext } from "../../../../.storybook/storyHelpers";
    import ActionBarButton from "./ActionBarButton.svelte";

    // ActionBarButton renders differently depending on the "inMenu" Svelte context (action-bar
    // pill vs. full-width menu row). The withContext() decorator provides that context so the
    // menu variant can be shown without an ancestor supplying it.
    const { Story } = defineMeta({
        title: "Feature/Action Bar Button",
        component: ActionBarButton,
        tags: ["autodocs"],
        args: {
            label: "Camera",
            dataTestId: "action-bar-button",
        },
    });
</script>

<Story
    name="InActionBar"
    play={async ({ canvasElement }) => {
        const button = canvasElement.querySelector("button[data-testid=action-bar-button]");
        await expect(button).toBeInTheDocument();
        // Action-bar variant is a pill, not the full-width menu row.
        await expect(button).not.toHaveClass("w-full");
    }}
>
    🎥
</Story>

<Story
    name="InMenu"
    decorators={[withContext("inMenu", true)]}
    play={async ({ canvasElement }) => {
        const button = canvasElement.querySelector("button[data-testid=action-bar-button]");
        await expect(button).toBeInTheDocument();
        // getContext("inMenu") === true selects the full-width menu row.
        await expect(button).toHaveClass("w-full");
    }}
>
    🎥
</Story>
