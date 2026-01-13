<script lang="ts">
    import { get } from "svelte/store";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { chatVisibilityStore, intentionallyClosedChatDuringMeetingStore } from "../../../Stores/ChatStore";
    import { selectedRoomStore } from "../../../Chat/Stores/SelectRoomStore";
    import { ProximityChatRoom } from "../../../Chat/Connection/Proximity/ProximityChatRoom";
    import { IconX } from "@wa-icons";

    export let last: boolean | undefined = undefined;

    function closeChat() {
        chatVisibilityStore.set(false);
        const selectedRoom = get(selectedRoomStore);
        if (selectedRoom instanceof ProximityChatRoom) {
            intentionallyClosedChatDuringMeetingStore.set(true);
        }
    }
</script>

<ActionBarButton on:click={closeChat} dataTestId="closeChatButton" {last} disabledHelp={false}>
    <IconX font-size="20" />
</ActionBarButton>
