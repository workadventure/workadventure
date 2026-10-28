<script lang="ts">
    import LL from "../../../../i18n/i18n-svelte";
    import { chatNotificationStore } from "../../../Stores/ProximityNotificationStore";
    import { focusNotificationMessage } from "../../../Components/ProximityNotification/NotificationRoomFocus";
    import Button from "../../../Components/UI/Button.svelte";
    import { chatMessageBannerStore, type ChatMessageBanner } from "../../Stores/ChatMessageBannerStore";
    import { selectedRoomStore } from "../../Stores/SelectRoomStore";
    import { selectedChatMessageToReply } from "../../Stores/ChatStore";
    import { mentionsToPlainText } from "../../Mentions";
    import Avatar from "../Avatar.svelte";
    import { IconX } from "@wa-icons";

    const AUTO_DISMISS_DELAY = 8000;

    let hovered = $state(false);

    // Restarted by every new banner, held while the pointer or the focus is on it.
    $effect(() => {
        const banner = $chatMessageBannerStore;
        if (!banner || hovered) return;
        const timeout = setTimeout(() => chatMessageBannerStore.dismiss(), AUTO_DISMISS_DELAY);
        return () => clearTimeout(timeout);
    });

    function open(banner: ChatMessageBanner): void {
        chatMessageBannerStore.dismiss();
        chatNotificationStore.clearRoom(banner.room.id);
        banner.room.setTimelineAsRead();
        selectedRoomStore.set(banner.room);
        focusNotificationMessage(banner.room, banner.message.id);
    }

    function reply(banner: ChatMessageBanner): void {
        open(banner);
        selectedChatMessageToReply.set(banner.message);
    }
</script>

{#if $chatMessageBannerStore}
    {@const banner = $chatMessageBannerStore}
    <div
        class="mx-2 flex items-start gap-2 rounded-lg border border-solid bg-contrast/80 p-2 text-sm text-white shadow-lg {banner.mentionsMe
            ? 'border-danger/60'
            : 'border-white/20'}"
        role="status"
        data-testid="chatMessageBanner"
        onmouseenter={() => (hovered = true)}
        onmouseleave={() => (hovered = false)}
        onfocusin={() => (hovered = true)}
        onfocusout={() => (hovered = false)}
    >
        <div class="relative mt-0.5 shrink-0">
            <Avatar
                pictureStore={banner.author.pictureStore}
                fallbackName={banner.senderName}
                color={banner.author.color ?? null}
            />
            {#if banner.mentionsMe}
                <span
                    class="absolute -bottom-1.5 -end-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-solid border-contrast bg-danger-1000 text-xxs font-bold"
                    >@</span
                >
            {/if}
        </div>
        <div class="flex min-w-0 grow flex-col gap-1">
            <div class="flex min-w-0 items-center gap-2 text-xs text-white/75">
                <span class="min-w-0 truncate font-bold text-white">
                    {banner.mentionsMe
                        ? $LL.notification.mention({ name: banner.senderName })
                        : $LL.chat.messageBanner.wroteToYou({ name: banner.senderName })}
                </span>
                {#if banner.roomName}
                    <span class="shrink-0 rounded-full bg-white/10 px-2 py-0.5" data-testid="chatMessageBannerRoom"
                        >{banner.roomName}</span
                    >
                {/if}
            </div>
            <div class="line-clamp-2 break-words" data-testid="chatMessageBannerBody">
                {mentionsToPlainText(banner.body)}
            </div>
            <div class="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="xs" onclick={() => open(banner)} dataTestId="chatMessageBannerOpen">
                    {$LL.chat.open()}
                </Button>
                <Button
                    variant="light"
                    appearance="ghost"
                    size="xs"
                    onclick={() => reply(banner)}
                    dataTestId="chatMessageBannerReply"
                >
                    {$LL.chat.reply()}
                </Button>
                {#if banner.others > 0}
                    <span class="text-xs text-white/60" data-testid="chatMessageBannerOthers"
                        >{$LL.chat.messageBanner.others({ count: banner.others })}</span
                    >
                {/if}
            </div>
        </div>
        <Button
            variant="light"
            appearance="ghost"
            size="xs"
            square
            onclick={() => chatMessageBannerStore.dismiss()}
            aria-label={$LL.chat.messageBanner.dismiss()}
            dataTestId="chatMessageBannerDismiss"
        >
            {#snippet icon()}
                <IconX font-size="16" />
            {/snippet}
        </Button>
    </div>
{/if}
