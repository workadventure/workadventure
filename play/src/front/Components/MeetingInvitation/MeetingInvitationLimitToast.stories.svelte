<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import MeetingInvitationLimitToast from "./MeetingInvitationLimitToast.svelte";

    const { Story } = defineMeta({
        title: "Feedback/Meeting Invitation/Limit Reached",
        component: MeetingInvitationLimitToast,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement.textContent?.trim()).toBeTruthy();
    }}
/>
