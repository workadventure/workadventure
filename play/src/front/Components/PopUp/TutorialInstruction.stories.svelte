<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import TutorialInstruction from "./TutorialInstruction.svelte";

    // Prop-driven: the story body is forwarded as the popup's `children`.
    const { Story } = defineMeta({
        title: "Feedback/PopUp/Tutorial Instruction",
        component: TutorialInstruction,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".popup-container")).toBeInTheDocument();
        await expect(canvasElement).toHaveTextContent("Walk around with the arrow keys.");
    }}
>
    Walk around with the arrow keys.
</Story>
