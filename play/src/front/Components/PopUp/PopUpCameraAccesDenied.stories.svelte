<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import type { UserInputManager } from "../../Phaser/UserInput/UserInputManager";
    import PopUpCameraAccesDenied from "./PopUpCameraAccesDenied.svelte";

    // Depends on a UserInputManager only to (de)register a space-key listener on mount/destroy —
    // a no-op stub is enough. The type import is type-only, so no Phaser runtime is pulled in.
    const userInputManager = {
        addSpaceEventListener: () => {},
        removeSpaceEventListener: () => {},
    } as unknown as UserInputManager;

    const { Story } = defineMeta({
        title: "Feedback/PopUp/Camera Access Denied",
        component: PopUpCameraAccesDenied,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
        args: {
            message: "Camera access was denied.",
            click: () => {},
            userInputManager,
        },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector(".popup-container")).toHaveTextContent("Camera access was denied.");
    }}
/>
