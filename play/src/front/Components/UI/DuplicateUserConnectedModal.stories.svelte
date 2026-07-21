<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import DuplicateUserConnectedModal from "./DuplicateUserConnectedModal.svelte";
    import { duplicateUserConnectedStore } from "../../Stores/DuplicateUserConnectedStore";
    import { withStore } from "../../../../.storybook/storyHelpers";

    // The modal only renders while `duplicateUserConnectedStore` is true. The harness sets it
    // for the story and restores it afterwards — a store-coupled component shown in isolation.
    const { Story } = defineMeta({
        title: "Feedback/Duplicate User Connected",
        component: DuplicateUserConnectedModal,
        parameters: { layout: "fullscreen" },
        beforeEach: withStore(duplicateUserConnectedStore.setDuplicateConnected, true, false),
    });
</script>

<Story
    name="Shown"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.querySelector("[role=alertdialog]")).toBeInTheDocument();
        const confirmButton = canvasElement.querySelector("[data-testid=duplicate-user-confirm-continue]");
        await expect(confirmButton).toBeInTheDocument();
    }}
/>
