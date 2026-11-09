<script lang="ts">
    import * as Sentry from "@sentry/svelte";
    import highlightWords from "highlight-words";
    import { readable } from "svelte/store";
    import { asError } from "catch-unknown";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { selectedRoomStore } from "../../Stores/SelectRoomStore";
    import Avatar from "../Avatar.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import type { JoinableRoomInfo } from "../../Connection/ChatConnection";
    import { ignoreSuggestedRoom } from "../../Stores/ChatStore";
    import { IconFolder, IconLoader } from "@wa-icons";

    interface Props {
        roomInformation: JoinableRoomInfo;
        /** Suggested rooms can be ignored; other joinable rooms cannot. */
        suggested?: boolean;
        /** Search text to highlight in the room name. */
        highlight?: string;
        onJoined?: () => void;
    }

    let { roomInformation, suggested = false, highlight = "", onJoined }: Props = $props();
    let roomName = $derived(roomInformation.name);
    let nameChunks = $derived(highlightWords({ text: roomName, query: highlight }));
    let pictureStore = $derived(readable(roomInformation.avatarUrl || undefined));
    let memberCount = $derived(
        roomInformation.memberCount === undefined
            ? undefined
            : $LL.chat.roomMemberCount({ count: roomInformation.memberCount }),
    );
    let loadingInvitation = $state(false);
    // Stays on the row until the next attempt, so it can be read.
    let joinError: Error | undefined = $state(undefined);

    async function joinRoom() {
        loadingInvitation = true;
        joinError = undefined;
        try {
            const chatConnection = await gameManager.getChatConnection();
            const room = await chatConnection.joinRoom(roomInformation.id);
            onJoined?.();
            if (room && !room.isRoomFolder) selectedRoomStore.set(room);
        } catch (error) {
            console.error(error);
            Sentry.captureException(error);
            joinError = asError(error);
        } finally {
            loadingInvitation = false;
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
        <div class="text-sm font-bold truncate" title={roomName}>
            {#each nameChunks as chunk (chunk.key)}<span class:text-light-blue={chunk.match}>{chunk.text}</span>{/each}
        </div>
        {#if roomInformation.folderName || roomInformation.topic || memberCount}
            <!-- Only the topic is cut: the folder and the member count stay readable on narrow chats. -->
            <div class="flex items-center gap-1 text-xs text-white/60 min-w-0">
                {#if roomInformation.folderName}
                    <span class="flex items-center gap-0.5 shrink-0 max-w-[40%]" data-testid="joinableRoomFolder">
                        <IconFolder font-size="0.875rem" class="shrink-0" />
                        <span class="truncate">{roomInformation.folderName}</span>
                    </span>
                {/if}
                {#if roomInformation.topic}
                    {#if roomInformation.folderName}<span aria-hidden="true">·</span>{/if}
                    <span class="truncate" title={roomInformation.topic}>{roomInformation.topic}</span>
                {/if}
                {#if memberCount}
                    {#if roomInformation.folderName || roomInformation.topic}<span aria-hidden="true">·</span>{/if}
                    <span class="shrink-0">{memberCount}</span>
                {/if}
            </div>
        {/if}
        {#if joinError}
            <div class="text-xs text-danger-400" role="alert" title={joinError.message}>
                {$LL.chat.failedToJoinRoom()}
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
