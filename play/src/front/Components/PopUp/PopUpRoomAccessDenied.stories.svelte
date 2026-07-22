<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import type { UserInputManager } from "../../Phaser/UserInput/UserInputManager";
    import PopUpRoomAccessDenied from "./PopUpRoomAccessDenied.svelte";

    const userInputManager = {
        addSpaceEventListener: () => {},
        removeSpaceEventListener: () => {},
    } as unknown as UserInputManager;

    const { Story } = defineMeta({
        title: "Feedback/PopUp/Room Access Denied",
        component: PopUpRoomAccessDenied,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
        args: {
            message: "You don't have access to this room.",
            onclick: () => {},
            userInputManager,
        },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        const popup = canvasElement.querySelector(".popup-container");
        await expect(popup).toHaveTextContent("You don't have access to this room.");
    }}
/>
