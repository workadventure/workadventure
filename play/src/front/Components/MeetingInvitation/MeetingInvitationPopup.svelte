<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { meetingInvitationRequestStore } from "../../Stores/MeetingInvitationStore";
    import { currentPlayerGroupLockStateStore } from "../../Stores/CurrentPlayerGroupStore";
    import Button from "../UI/Button.svelte";
    import WokaFromUserId from "../Woka/WokaFromUserId.svelte";
    import { IconUsersGroup } from "@wa-icons";

    let request = $derived($meetingInvitationRequestStore);
    // Already talking in a bubble: offer to bring the sender here instead of leaving the conversation
    let inBubble = $derived($currentPlayerGroupLockStateStore !== undefined);

    function onBring() {
        gameManager.getCurrentGameScene().inviteManager?.handleBring({
            senderUserUuid: request?.senderUserUuid ?? "",
            senderPlayUri: request?.senderPlayUri ?? "",
            senderName: request?.senderName ?? "",
            senderUserId: request?.senderUserId ?? 0,
        });
        meetingInvitationRequestStore.set(null);
    }

    function onAccept() {
        gameManager.getCurrentGameScene().inviteManager?.handleAccept({
            senderUserUuid: request?.senderUserUuid ?? "",
            senderPlayUri: request?.senderPlayUri ?? "",
            senderName: request?.senderName ?? "",
            senderUserId: request?.senderUserId ?? 0,
        });
        meetingInvitationRequestStore.set(null);
    }

    function onDecline() {
        gameManager.getCurrentGameScene().inviteManager?.handleDecline({
            senderUserUuid: request?.senderUserUuid ?? "",
            senderPlayUri: request?.senderPlayUri ?? "",
            senderName: request?.senderName ?? "",
            senderUserId: request?.senderUserId ?? 0,
        });
        meetingInvitationRequestStore.set(null);
    }
</script>

<div
    class="m-auto my-0 h-fit min-h-fit max-w-lg min-w-48 max-sm:max-w-[89%] z-50 bg-contrast/80 transition-all backdrop-blur rounded-lg pointer-events-auto overflow-hidden md:mr-0"
    data-testid="meeting-invitation-popup"
>
    <div class="p-4 flex flex-col gap-4">
        <div class="flex items-start gap-3">
            <div
                class="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden relative"
                aria-hidden="true"
            >
                {#if request?.senderUserUuid}
                    <div class="absolute inset-0 flex items-center justify-center">
                        <WokaFromUserId userId={request?.senderUserUuid} placeholderSrc="" customWidth="40px" />
                    </div>
                {:else}
                    <IconUsersGroup font-size="20" class="text-white" />
                {/if}
            </div>
            <div class="flex-1 min-w-0 pt-0.5">
                <p class="text-sm text-white/95 leading-snug">
                    {$LL.chat.meetingInvitation.title({ name: request?.senderName ?? "" })}
                </p>
                {#if inBubble}
                    <p class="text-xs text-white/60 leading-snug mt-1">
                        {$LL.chat.meetingInvitation.leaveWarning()}
                    </p>
                {/if}
            </div>
        </div>
    </div>
    <div class="flex items-center bg-contrast w-full justify-center flex-row">
        <Button
            variant="light"
            appearance="ghost"
            class="text-nowrap my-2 mx-1 min-w-0 !border !border-solid !border-transparent hover:!bg-white/30"
            onclick={onAccept}
            data-testid="meeting-invitation-accept"
        >
            {inBubble ? $LL.chat.meetingInvitation.join() : $LL.chat.accept()}
        </Button>
        {#if inBubble}
            <Button
                variant="light"
                appearance="ghost"
                class="text-nowrap my-2 mx-1 min-w-0 !border !border-solid !border-transparent hover:!bg-white/30"
                onclick={onBring}
                data-testid="meeting-invitation-bring"
            >
                {$LL.chat.meetingInvitation.bringHere()}
            </Button>
        {/if}
        <Button
            variant="light"
            appearance="ghost"
            class="text-nowrap my-2 mx-1 min-w-0 !border !border-solid !border-transparent hover:!border hover:!border-solid hover:!border-white/30 hover:!bg-transparent"
            onclick={onDecline}
        >
            {$LL.chat.decline()}
        </Button>
    </div>
</div>
