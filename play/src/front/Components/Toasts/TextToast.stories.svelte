<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import TextToast from "./TextToast.svelte";

    const { Story } = defineMeta({
        title: "Feedback/Text Toast",
        component: TextToast,
        tags: ["autodocs"],
        argTypes: {
            theme: { control: { type: "select" }, options: ["success", "error", "secondary"] },
        },
        args: {
            message: "Connection restored.",
            theme: "success",
            // Keep it on screen for the story rather than auto-dismissing.
            duration: 1_000_000,
        },
    });
</script>

<Story
    name="Success"
    play={async ({ canvasElement }) => {
        await expect(canvasElement).toHaveTextContent("Connection restored.");
    }}
/>

<Story name="Error" args={{ message: "Something went wrong.", theme: "error" }} />

<Story name="Secondary" args={{ message: "A new area is available.", theme: "secondary" }} />
