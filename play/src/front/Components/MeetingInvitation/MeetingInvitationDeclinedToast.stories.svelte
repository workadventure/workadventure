<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import MeetingInvitationDeclinedToast from "./MeetingInvitationDeclinedToast.svelte";

    const { Story } = defineMeta({
        title: "Feedback/Meeting Invitation/Declined",
        component: MeetingInvitationDeclinedToast,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
        args: {
            responderName: "Bob",
        },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement).toHaveTextContent("Bob");
    }}
/>
