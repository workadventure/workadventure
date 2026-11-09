<script lang="ts">
    import { EventType } from "matrix-js-sdk/lib/@types/event";
    import LL from "../../../../i18n/i18n-svelte";
    import type { ChatRoomMember, ChatRoomModeration } from "../../Connection/ChatConnection";
    import { ChatPermissionLevel } from "../../Connection/ChatConnection";
    import ChatMenu from "../ChatMenu.svelte";
    import RoomOption from "./RoomMenu/RoomOption.svelte";
    import { cancelInvitation, changeRole, confirmBan, confirmKick, inviteAgain, unban } from "./memberModeration";
    import { IconDoorExit, IconForbid, IconMail, IconUserEdit, IconX } from "@wa-icons";

    interface Props {
        room: ChatRoomModeration;
        member: ChatRoomMember;
    }

    let { room, member }: Props = $props();

    let name = $derived(member.name);
    let membership = $derived(member.membership);
    let permissionLevel = $derived(member.permissionLevel);
    let canKick = $derived(room.hasPermissionTo("kick", member));
    let canBan = $derived(room.hasPermissionTo("ban", member));
    let canInvite = $derived(room.hasPermissionTo("invite", member));
    let canChangeRoles = $derived(room.hasPermissionForRoomStateEvent(EventType.RoomPowerLevels));
    let otherRoles = $derived(
        $canChangeRoles && $membership === "join" && room.canModifyRoleOf($permissionLevel)
            ? room.getAllowedRolesToAssign().filter((role) => role !== $permissionLevel)
            : [],
    );

    function roleName(role: ChatPermissionLevel): string {
        switch (role) {
            case ChatPermissionLevel.ADMIN:
                return $LL.chat.manageRoomUsers.roles.ADMIN();
            case ChatPermissionLevel.MODERATOR:
                return $LL.chat.manageRoomUsers.roles.MODERATOR();
            default:
                return $LL.chat.manageRoomUsers.roles.USER();
        }
    }

    let hasActions = $derived(
        otherRoles.length > 0 ||
            ($canKick && ($membership === "join" || $membership === "invite")) ||
            ($canBan && $membership !== "ban") ||
            ($canBan && $membership === "ban") ||
            ($canInvite && $membership === "leave"),
    );
</script>

{#if hasActions}
    <span class="relative">
        <ChatMenu
            label={$LL.chat.a11y.optionsFor({ name: $name })}
            dataTestId={`${member.id}-panel-memberMenu`}
            buttonClass="m-0 p-0 flex items-center justify-center h-7 w-7 hover:bg-white/10 rounded shrink-0"
            menuClass="bg-contrast/90 backdrop-blur-md rounded-md overflow-hidden z-[99] w-max end-0 top-8 p-1"
        >
            {#each otherRoles as role (role)}
                <RoomOption
                    IconComponent={IconUserEdit}
                    title={$LL.chat.manageRoomUsers.setRole({ role: roleName(role) })}
                    dataTestId={`${member.id}-panel-role-${role}`}
                    onclick={() => changeRole(room, member, role)}
                />
            {/each}
            {#if $canInvite && $membership === "leave"}
                <RoomOption
                    IconComponent={IconMail}
                    title={$LL.chat.manageRoomUsers.buttons.invite()}
                    dataTestId={`${member.id}-panel-inviteButton`}
                    onclick={() => inviteAgain(room, member)}
                />
            {/if}
            {#if $canKick && $membership === "invite"}
                <RoomOption
                    IconComponent={IconX}
                    title={$LL.chat.manageRoomUsers.buttons.cancelInvitation()}
                    dataTestId={`${member.id}-panel-cancelInvitationButton`}
                    onclick={() => cancelInvitation(room, member)}
                />
            {/if}
            {#if $canKick && $membership === "join"}
                <RoomOption
                    IconComponent={IconDoorExit}
                    title={`${$LL.chat.manageRoomUsers.buttons.kick()}…`}
                    bg="hover:bg-danger/40"
                    dataTestId={`${member.id}-panel-kickButton`}
                    onclick={() => confirmKick(room, member)}
                />
            {/if}
            {#if $canBan && $membership === "ban"}
                <RoomOption
                    IconComponent={IconForbid}
                    title={$LL.chat.manageRoomUsers.buttons.unban()}
                    dataTestId={`${member.id}-panel-unbanButton`}
                    onclick={() => unban(room, member)}
                />
            {:else if $canBan}
                <RoomOption
                    IconComponent={IconForbid}
                    title={`${$LL.chat.manageRoomUsers.buttons.ban()}…`}
                    bg="hover:bg-danger/40"
                    dataTestId={`${member.id}-panel-banButton`}
                    onclick={() => confirmBan(room, member)}
                />
            {/if}
        </ChatMenu>
    </span>
{/if}
