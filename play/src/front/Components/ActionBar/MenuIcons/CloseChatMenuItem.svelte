<script lang="ts">
    import { get } from "svelte/store";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { chatVisibilityStore } from "../../../Stores/ChatStore";
    import { selectedRoomStore } from "../../../Chat/Stores/SelectRoomStore";
    import { ProximityChatRoom } from "../../../Chat/Connection/Proximity/ProximityChatRoom";
    import { IconX } from "@wa-icons";

    interface Props {
        last?: boolean;
    }

    let { last = undefined }: Props = $props();

    function closeChat() {
        chatVisibilityStore.set(false);
        const selectedRoom = get(selectedRoomStore);
        if (selectedRoom instanceof ProximityChatRoom) {
            selectedRoom.intentionallyClosed.set(true);
        }
    }
</script>

<ActionBarButton onclick={closeChat} dataTestId="closeChatButton" {last} disabledHelp={false}>
    <IconX font-size="20" />
</ActionBarButton>
