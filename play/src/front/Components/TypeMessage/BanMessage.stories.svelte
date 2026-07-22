<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import BanMessage from "./BanMessage.svelte";

    const { Story } = defineMeta({
        title: "Feedback/Ban Message",
        component: BanMessage,
        tags: ["autodocs"],
        args: {
            message: { id: "1", text: "You have been banned for violating the community rules." },
        },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".main-ban-message")).toBeInTheDocument();
        await expect(canvasElement).toHaveTextContent("violating the community rules");
    }}
/>
