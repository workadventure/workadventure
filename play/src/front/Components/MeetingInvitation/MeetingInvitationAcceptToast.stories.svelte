<script module lang="ts">
    import { expect } from "storybook/test";
    import { defineMeta } from "@storybook/addon-svelte-csf";
    import MeetingInvitationAcceptToast from "./MeetingInvitationAcceptToast.svelte";

    const { Story } = defineMeta({
        title: "Feedback/Meeting Invitation/Accepted",
        component: MeetingInvitationAcceptToast,
        tags: ["autodocs"],
        parameters: { layout: "centered" },
        args: {
            responderName: "Alice",
        },
    });
</script>

<Story
    name="Default"
    play={async ({ canvasElement }) => {
        await expect(canvasElement).toHaveTextContent("Alice");
    }}
/>
