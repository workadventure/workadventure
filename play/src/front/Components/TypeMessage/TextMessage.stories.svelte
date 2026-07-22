<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import TextMessage from "./TextMessage.svelte";

    // TextMessage parses `message.text` as a Quill delta (JSON) and renders it as HTML.
    const delta = JSON.stringify({ ops: [{ insert: "Hello everyone, the event starts now.\n" }] });

    const { Story } = defineMeta({
        title: "Feedback/Text Message",
        component: TextMessage,
        tags: ["autodocs"],
        args: {
            message: { id: "1", text: delta },
        },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".main-text-message")).toBeInTheDocument();
        await expect(canvasElement).toHaveTextContent("Hello everyone");
    }}
/>
