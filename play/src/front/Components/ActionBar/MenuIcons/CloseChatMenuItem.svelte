<script lang="ts">
    import ActionBarButton from "../ActionBarButton.svelte";
    import { chatVisibilityStore } from "../../../Stores/ChatStore";
    import { IconX } from "@wa-icons";

    export let last: boolean | undefined = undefined;

    function closeChat() {
        chatVisibilityStore.set(false);
    }
</script>

<ActionBarButton on:click={closeChat} dataTestId="closeChatButton" {last} disabledHelp={false}>
    <IconX font-size="20" />
</ActionBarButton>
