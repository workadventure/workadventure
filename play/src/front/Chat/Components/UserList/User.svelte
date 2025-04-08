<script lang="ts">
    import { AvailabilityStatus } from "@workadventure/messages";
    import highlightWords from "highlight-words";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { availabilityStatusStore } from "../../../Stores/MediaStore";
    import { getColorHexOfStatus } from "../../../Utils/AvailabilityStatus";
    import { ChatUser } from "../../Connection/ChatConnection";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { chatSearchBarValue } from "../../Stores/ChatStore";
    import { defaultColor, defaultWoka } from "../../Connection/Matrix/MatrixChatConnection";
    import { openDirectChatRoom } from "../../Utils";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import UserActionButton from "./UserActionButton.svelte";
    import ImageWithFallback from "./ImageWithFallback.svelte";
    import { IconLoader, IconSend } from "@wa-icons";

    export let user: ChatUser;

    let showRoomCreationInProgress = false;

    $: ({ chatId, availabilityStatus, username = "", color, isAdmin, avatarUrl } = user);

    $: isMe = user.chatId === localUserStore.getChatId() || user.chatId === localUserStore.getLocalUser()?.uuid;

    $: userStatus = isMe ? availabilityStatusStore : availabilityStatus;

    $: chunks = highlightWords({
        text: username.match(/\[\d*]/) ? username.substring(0, username.search(/\[\d*]/)) : username,
        query: $chatSearchBarValue,
    });

    $: roomCreationInProgress = gameManager.chatConnection.roomCreationInProgress;

    function getNameOfAvailabilityStatus(status: AvailabilityStatus) {
        switch (status) {
            case AvailabilityStatus.ONLINE:
                return $LL.chat.status.online();
            case AvailabilityStatus.AWAY:
                return $LL.chat.status.away();
            case AvailabilityStatus.BUSY:
                return $LL.chat.status.busy();
            case AvailabilityStatus.DO_NOT_DISTURB:
                return $LL.chat.status.do_not_disturb();
            case AvailabilityStatus.BACK_IN_A_MOMENT:
                return $LL.chat.status.back_in_a_moment();
            case AvailabilityStatus.JITSI:
            case AvailabilityStatus.BBB:
                return $LL.chat.status.meeting();
            case AvailabilityStatus.SPEAKER:
                return $LL.chat.status.megaphone();
            case AvailabilityStatus.SILENT:
            default:
                return $LL.chat.status.unavailable();
        }
    }

    let loadingDirectRoomAccess = false;
</script>

{#if loadingDirectRoomAccess}
    <div class="tw-min-h-[60px] tw-text-md tw-flex tw-gap-2 tw-justify-center tw-flex-row tw-items-center tw-p-1">
        <IconLoader class="tw-animate-spin" />
    </div>
{:else}
    <div class="tw-flex tw-flex-col tw-px-2 tw-pb-2 user">
        <div
            class="wa-chat-item {isAdmin
                ? 'admin'
                : 'user'} tw-group/chatItem tw-relative tw-mb-[1px] tw-text-md tw-flex tw-gap-2 tw-flex-row tw-items-center hover:tw-bg-white tw-transition-all hover:tw-bg-opacity-10 hover:tw-rounded-md hover:!tw-cursor-pointer tw-px-2 tw-py-2 tw-cursor-pointer"
        >
            <div
                class="tw-relative wa-avatar {!$userStatus
                    ? 'tw-opacity-50'
                    : ''} tw-cursor-default tw-w-7 tw-h-7 tw-rounded-lg"
                style={`background-color: ${color ?? defaultColor}`}
            >
                <div class="tw-w-7 tw-h-7 tw-rounded-lg tw-overflow-hidden">
                    <div
                        class="tw-translate-y-[3px] -tw-translate-x-[3px] group-hover/chatItem:tw-translate-y-[0] tw-transition-all"
                    >
                        <ImageWithFallback
                            classes="tw-w-8 tw-h-8 tw-cursor-default"
                            src={avatarUrl}
                            alt="Avatar"
                            fallback={defaultWoka}
                        />
                    </div>
                </div>
            </div>
            <div class={`tw-flex-auto tw-ml-1 ${!$userStatus && "tw-opacity-50"}  tw-cursor-default`}>
                <div class="tw-flex tw-items-center tw-h-4">
                    <div class="tw-text-sm tw-font-bold tw-mb-0 tw-cursor-default tw-flex tw-items-center">
                        {#each chunks as chunk (chunk.key)}
                            <div class={`${chunk.match ? "tw-text-light-blue" : ""}  tw-cursor-default`}>
                                {chunk.text}
                            </div>
                        {/each}
                        {#if username && username.match(/\[\d*]/)}
                            <div class="tw-font-light tw-text-xs tw-text-gray tw-cursor-default">
                                #{username
                                    .match(/\[\d*]/)
                                    ?.join()
                                    ?.replace("[", "")
                                    ?.replace("]", "")}
                            </div>
                        {/if}
                        {#if isAdmin}
                            <div
                                class="tw-text-xxs tw-bg-secondary tw-rounded-sm tw-px-1 tw-py-0.5 tw-ml-1"
                                title={$LL.chat.role.admin()}
                            >
                                {$LL.chat.role.adminShort()}
                            </div>
                        {/if}
                    </div>
                </div>
                <div class="tw-text-xs tw-mb-0 tw-font-condensed tw-opacity-75 tw-cursor-default tw-self-end">
                    {#if isMe}
                        {$LL.chat.you()}
                    {:else if $userStatus}
                        <div
                            class="tw-flex tw-items-center tw-brightness-150"
                            style="color:{getColorHexOfStatus($userStatus)}"
                        >
                            {#if $userStatus}
                                <div
                                    class="tw-rounded-full tw-mr-1 tw-h-1.5 tw-w-1.5"
                                    style="background:{getColorHexOfStatus($userStatus)}"
                                />
                            {/if}
                            {getNameOfAvailabilityStatus($userStatus ?? 0)}
                        </div>
                    {:else}
                        {$LL.chat.userList.disconnected()}
                    {/if}
                </div>
            </div>
            <div class="group-hover/chatItem:tw-opacity-100 tw-opacity-0 tw-transition-all">
                {#if !isMe}
                    <UserActionButton {user} />
                {/if}
            </div>
            {#if !isMe && !showRoomCreationInProgress}
                <button
                    class="tw-transition-all group-hover/chatItem:tw-bg-white/10 tw-p-1 tw-rounded-lg tw-aspect-square tw-flex tw-items-center tw-justify-center tw-text-white group-hover/chatItem:tw-opacity-100 tw-opacity-0 tw-m-0"
                    on:click|stopPropagation={() => {
                        if (user.chatId !== user.uuid && !isMe) {
                            showRoomCreationInProgress = true;
                            openDirectChatRoom(chatId)
                                .catch((error) => console.error(error))
                                .finally(() => {
                                    showRoomCreationInProgress = false;
                                });
                        }
                    }}
                >
                    <IconSend font-size="16" />
                </button>
            {:else if $roomCreationInProgress && showRoomCreationInProgress}
                <div
                    class="tw-min-h-[30px] tw-text-md tw-flex tw-gap-2 tw-justify-center tw-flex-row tw-items-center tw-p-1"
                >
                    <IconLoader class="tw-animate-spin" />
                </div>
            {/if}
        </div>
    </div>

    <style lang="scss">
        .status {
            background-color: var(--color);
        }
    </style>
{/if}
