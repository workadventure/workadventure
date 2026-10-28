<script lang="ts">
    import * as Sentry from "@sentry/svelte";
    import { readable } from "svelte/store";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { selectedRoomStore } from "../../Stores/SelectRoomStore";
    import { warningMessageStore } from "../../../Stores/ErrorStore";
    import Avatar from "../Avatar.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import type { JoinableRoomInfo } from "../../Connection/ChatConnection";
    import { ignoreSuggestedRoom } from "../../Stores/ChatStore";
    import { IconLoader } from "@wa-icons";

    interface Props {
        roomInformation: JoinableRoomInfo;
        /** Suggested rooms can be ignored; other joinable rooms cannot. */
        suggested?: boolean;
    }

    let { roomInformation, suggested = false }: Props = $props();
    let roomName = $derived(roomInformation.name);
    let pictureStore = $derived(readable(roomInformation.avatarUrl || undefined));
    let memberCount = $derived(
        roomInformation.memberCount === undefined
            ? undefined
            : $LL.chat.roomMemberCount({ count: roomInformation.memberCount }),
    );
    let loadingInvitation = $state(false);

    async function joinRoom() {
        loadingInvitation = true;
        try {
            const chatconnection = await gameManager.getChatConnection();
            chatconnection
                .joinRoom(roomInformation.id)
                .then((room) => {
                    if (room && !room.isRoomFolder) selectedRoomStore.set(room);
                })
                .catch(() => {
                    warningMessageStore.addWarningMessage($LL.chat.failedToJoinRoom());
                })
                .finally(() => {
                    loadingInvitation = false;
                });
        } catch (error) {
            loadingInvitation = false;
            console.error(error);
            Sentry.captureException(error);
            warningMessageStore.addWarningMessage($LL.chat.failedToJoinRoom());
        }
    }

    function onIgnoreClick(event: MouseEvent) {
        event.stopPropagation();
        event.preventDefault();
        ignoreSuggestedRoom(roomInformation.id);
    }
</script>

<div
    class="wa-chat-item text-md flex gap-2 flex-row items-center transition-all hover:bg-white/10 hover:rounded hover:!cursor-pointer px-2 py-2"
    data-testid="userInvitation"
>
    <div class="relative shrink-0">
        <Avatar compact {pictureStore} fallbackName={roomName} />
    </div>
    <div class="m-0 grow min-w-0">
        <div class="text-sm font-bold truncate" title={roomName}>{roomName}</div>
        {#if roomInformation.topic || memberCount}
            <!-- Only the topic is cut: the member count stays readable on narrow chats. -->
            <div class="flex items-center gap-1 text-xs text-white/60 min-w-0">
                {#if roomInformation.topic}
                    <span class="truncate" title={roomInformation.topic}>{roomInformation.topic}</span>
                {/if}
                {#if memberCount}
                    <span class="shrink-0">{roomInformation.topic ? "· " : ""}{memberCount}</span>
                {/if}
            </div>
        {/if}
    </div>
    <div class="flex gap-1 shrink-0">
        {#if suggested}
            <button
                type="button"
                class="border border-solid border-white/35 text-white/80 hover:bg-white/10 rounded text-xs py-1 px-2 m-0"
                data-testid="ignoreSuggestedRoomButton"
                disabled={loadingInvitation}
                onclick={onIgnoreClick}
            >
                {$LL.chat.ignoreSuggestedRoom()}
            </button>
        {/if}
        <button
            class="border border-solid border-success text-success hover:bg-success-400/10 rounded text-xs py-1 px-2 m-0 relative flex items-center justify-center"
            data-testid="acceptInvitationButton"
            disabled={loadingInvitation}
            aria-busy={loadingInvitation}
            onclick={() => joinRoom()}
        >
            <!-- The label stays in place, hidden, so the button keeps its width while the spinner turns. -->
            <span class:invisible={loadingInvitation}>{$LL.chat.join()}</span>
            {#if loadingInvitation}
                <IconLoader class="animate-spin absolute" font-size="1rem" />
            {/if}
        </button>
    </div>
</div>
