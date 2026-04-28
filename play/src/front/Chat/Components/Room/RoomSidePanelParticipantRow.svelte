<script lang="ts">
    import { defaultColor } from "@workadventure/shared-utils";
    import { openModal } from "svelte-modals";
    import { IconSettings } from "@wa-icons";
    import LL from "../../../../i18n/i18n-svelte";
    import { DEBUG_MODE } from "../../../Enum/EnvironmentVariable";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { isMatrixChatEnabledStore } from "../../../Stores/ChatStore";
    import {
        ChatPermissionLevel,
        hasMatrixChatCapabilities,
        type ChatRoomMember,
        type MatrixChatConnectionLike,
    } from "../../Connection/ChatConnection";
    import MatrixPeerProfileDebugModal from "../MatrixPeerProfileDebugModal.svelte";
    import Avatar from "../Avatar.svelte";

    export let member: ChatRoomMember;

    $: memberNameStore = member.name;
    $: memberPermissionLevelStore = member.permissionLevel;
    $: memberAvatarColorStore = member.avatarFallbackColor;

    function matrixConnectionFromGameManager(): MatrixChatConnectionLike | undefined {
        try {
            const c = gameManager.chatConnection;
            return hasMatrixChatCapabilities(c) ? c : undefined;
        } catch {
            return undefined;
        }
    }

    $: matrixChatConnection = $isMatrixChatEnabledStore ? matrixConnectionFromGameManager() : undefined;
    $: showMatrixPeerProfileDebug = DEBUG_MODE && matrixChatConnection !== undefined && Boolean(member.id);

    function openMatrixPeerProfileDebug() {
        if (!matrixChatConnection) {
            return;
        }
        openModal(MatrixPeerProfileDebugModal, {
            connection: matrixChatConnection,
            matrixUserId: member.id,
            label: $memberNameStore,
        });
    }
</script>

<div
    class="flex items-center gap-3 rounded-lg border border-solid border-white/10 bg-white/[0.03] px-3 py-2"
    data-testid="roomSidePanelParticipantRow"
>
    <Avatar
        compact
        pictureStore={member.pictureStore}
        fallbackName={$memberNameStore || "?"}
        color={$memberAvatarColorStore ?? defaultColor}
    />

    <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-semibold text-white">{$memberNameStore || "?"}</div>
        <div class="truncate text-xs opacity-70">
            {#if $memberPermissionLevelStore === ChatPermissionLevel.ADMIN}
                {$LL.chat.manageRoomUsers.roles.ADMIN()}
            {:else if $memberPermissionLevelStore === ChatPermissionLevel.MODERATOR}
                {$LL.chat.manageRoomUsers.roles.MODERATOR()}
            {:else}
                {$LL.chat.manageRoomUsers.roles.USER()}
            {/if}
        </div>
    </div>

    {#if showMatrixPeerProfileDebug}
        <button
            type="button"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-solid border-white/10 bg-white/[0.04] text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            title={$LL.chat.matrixPeerProfileDebug.menuItemTitle()}
            aria-label={$LL.chat.matrixPeerProfileDebug.menuItemTitle()}
            data-testid="participant-matrix-peer-profile-debug"
            on:click|stopPropagation={openMatrixPeerProfileDebug}
        >
            <IconSettings font-size={16} />
        </button>
    {/if}
</div>
