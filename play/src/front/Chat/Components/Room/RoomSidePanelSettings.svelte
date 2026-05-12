<script lang="ts">
    import { readable } from "svelte/store";
    import LL from "../../../../i18n/i18n-svelte";
    import type {
        ChatRoom,
        ChatRoomMembershipManagement,
        ChatRoomModeration,
        ChatRoomPrivacyState,
    } from "../../Connection/ChatConnection";

    export let room: ChatRoom & ChatRoomMembershipManagement & ChatRoomModeration;

    const emptyPrivacyState = readable<ChatRoomPrivacyState>({});
    $: roomType = room.type;
    $: isEncrypted = room.isEncrypted;
    $: privacyState = room.privacyState ?? emptyPrivacyState;
</script>

<div class="flex h-full min-h-0 flex-col bg-white/[0.02]" data-testid="roomSidePanelSettings">
    <div class="flex-1 overflow-y-auto px-3 py-3">
        <div class="flex flex-col gap-2 text-sm">
            <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3">
                <div class="text-xs font-semibold uppercase text-white/45">
                    {$LL.chat.roomPanel.settings.roomType()}
                </div>
                <div class="mt-1 text-white">
                    {$roomType === "direct"
                        ? $LL.chat.roomPanel.home.directRoom()
                        : $LL.chat.roomPanel.home.groupRoom()}
                </div>
            </div>

            <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3">
                <div class="text-xs font-semibold uppercase text-white/45">
                    {$LL.chat.roomPanel.settings.encryption()}
                </div>
                <div class="mt-1 text-white">
                    {$isEncrypted ? $LL.chat.roomPanel.home.encrypted() : $LL.chat.roomPanel.home.notEncrypted()}
                </div>
            </div>

            <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3">
                <div class="text-xs font-semibold uppercase text-white/45">
                    {$LL.chat.roomPanel.settings.joinRule()}
                </div>
                <div class="mt-1 text-white">
                    {#if $privacyState.joinRule === "public"}
                        {$LL.chat.roomPanel.settings.joinRules.public()}
                    {:else if $privacyState.joinRule === "invite"}
                        {$LL.chat.roomPanel.settings.joinRules.invite()}
                    {:else if $privacyState.joinRule === "restricted"}
                        {$LL.chat.roomPanel.settings.joinRules.restricted()}
                    {:else if $privacyState.joinRule === "knock"}
                        {$LL.chat.roomPanel.settings.joinRules.knock()}
                    {:else}
                        {$privacyState.joinRule ?? $LL.chat.roomPanel.settings.unknown()}
                    {/if}
                </div>
            </div>

            <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3">
                <div class="text-xs font-semibold uppercase text-white/45">
                    {$LL.chat.createRoom.historyVisibility.label()}
                </div>
                <div class="mt-1 text-white">
                    {#if $privacyState.historyVisibility === "world_readable"}
                        {$LL.chat.createRoom.historyVisibility.world_readable()}
                    {:else if $privacyState.historyVisibility === "invited"}
                        {$LL.chat.createRoom.historyVisibility.invited()}
                    {:else if $privacyState.historyVisibility === "joined"}
                        {$LL.chat.createRoom.historyVisibility.joined()}
                    {:else}
                        {$privacyState.historyVisibility ?? $LL.chat.roomPanel.settings.unknown()}
                    {/if}
                </div>
            </div>

            {#if $privacyState.restrictedRoomId}
                <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3">
                    <div class="text-xs font-semibold uppercase text-white/45">
                        {$LL.chat.roomPanel.settings.restrictedTo()}
                    </div>
                    <div class="mt-1 break-all text-white">{$privacyState.restrictedRoomId}</div>
                </div>
            {/if}

            <div class="rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3 text-xs text-white/60">
                {$LL.chat.roomPanel.settings.readOnly()}
            </div>
        </div>
    </div>
</div>
