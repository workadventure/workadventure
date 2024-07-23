<script lang="ts">
    import highlightWords from "highlight-words";
    import { ChatRoom } from "../../Connection/ChatConnection";
    import NotificationBadge from "../NotificationBadge.svelte";
    import { chatSearchBarValue, selectedRoom } from "../../Stores/ChatStore";
    import Avatar from "../Avatar.svelte";
    import EncryptionBadge from "../EncryptionBadge.svelte";
    import RoomMenu from "./RoomMenu/RoomMenu.svelte";

    export let room: ChatRoom;

    let hasUnreadMessage = room.hasUnreadMessages;
    let roomName = room.name;
    let isEncrypted = room.isEncrypted;

    $: chunks = highlightWords({
        text: $roomName.match(/\[\d*]/) ? $roomName.substring(0, $roomName.search(/\[\d*]/)) : $roomName,
        query: $chatSearchBarValue,
    });

    $: isSelected = $selectedRoom?.id === room.id;
</script>

<div
    class="tw-text-md tw-flex tw-gap-2 tw-flex-row tw-items-center hover:tw-bg-white hover:tw-bg-opacity-10 hover:tw-rounded-md hover:!tw-cursor-pointer tw-p-1"
    class:tw-bg-white={isSelected}
    class:tw-bg-opacity-10={isSelected}
    class:tw-rounded-md={isSelected}
    on:click={() => selectedRoom.set(room)}
>
    <div class="tw-relative">
        <Avatar avatarUrl={room.avatarUrl} fallbackName={$roomName} />
        {#if $hasUnreadMessage}
            <NotificationBadge type="error" />
        {/if}
        {#if $isEncrypted}
            <EncryptionBadge />
        {/if}
    </div>
    <p class="tw-m-0 tw-flex-1">
        {#each chunks as chunk (chunk.key)}
            <span class={`${chunk.match ? "tw-text-light-blue" : ""}  tw-cursor-default`}>{chunk.text}</span>
        {/each}
    </p>
    <RoomMenu {room} />
</div>
