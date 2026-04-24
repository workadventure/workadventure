<script lang="ts">
    import { defaultColor } from "@workadventure/shared-utils";
    import LL from "../../../../i18n/i18n-svelte";
    import { ChatPermissionLevel, type ChatRoomMember } from "../../Connection/ChatConnection";
    import Avatar from "../Avatar.svelte";

    export let member: ChatRoomMember;

    $: memberNameStore = member.name;
    $: memberPermissionLevelStore = member.permissionLevel;
    $: memberAvatarColorStore = member.avatarFallbackColor;

    function getPermissionLevelLabel(permissionLevel: ChatPermissionLevel) {
        switch (permissionLevel) {
            case ChatPermissionLevel.ADMIN:
                return $LL.chat.manageRoomUsers.roles.ADMIN();
            case ChatPermissionLevel.MODERATOR:
                return $LL.chat.manageRoomUsers.roles.MODERATOR();
            case ChatPermissionLevel.USER:
            default:
                return $LL.chat.manageRoomUsers.roles.USER();
        }
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
        <div class="truncate text-xs opacity-70">{getPermissionLevelLabel($memberPermissionLevelStore)}</div>
    </div>
</div>
