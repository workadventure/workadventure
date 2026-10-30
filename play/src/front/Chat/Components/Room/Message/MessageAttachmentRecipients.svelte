<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { ChatAttachmentRecipient } from "../../../Connection/ChatConnection";
    import Avatar from "../../Avatar.svelte";
    import LL from "../../../../../i18n/i18n-svelte";
    import { IconCheck, IconClock, IconX } from "@wa-icons";

    interface Props {
        recipients: Readable<ChatAttachmentRecipient[]>;
    }

    let { recipients }: Props = $props();

    let received = $derived($recipients.filter((recipient) => recipient.state === "received").length);
    let pending = $derived($recipients.filter((recipient) => recipient.state === "waiting").length);

    function label(recipient: ChatAttachmentRecipient): string {
        return recipient.state === "sending"
            ? `${Math.floor(recipient.progress * 100)}%`
            : $LL.chat.file.recipient[recipient.state]();
    }

    // While sending, the ring fills up clockwise; the mask hollows it into a 2px ring around the avatar.
    function sendingRingStyle(progress: number): string {
        const hollow = "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))";
        return `background: conic-gradient(#fff ${progress * 100}%, rgb(255 255 255 / 0.22) 0); mask: ${hollow}; -webkit-mask: ${hollow}`;
    }

    // The ring around a recipient's avatar carries their state; the colored badge repeats it for color-blind users.
    const ringClass: Record<ChatAttachmentRecipient["state"], string> = {
        waiting: "border-2 border-dashed border-warning animate-[spin_6s_linear_infinite] motion-reduce:animate-none",
        sending: "",
        received: "border-2 border-success",
        declined: "border-2 border-white/30",
        failed: "border-2 border-danger",
    };
    const labelClass: Record<ChatAttachmentRecipient["state"], string> = {
        waiting: "text-warning-400",
        sending: "font-bold",
        received: "text-success-300",
        declined: "",
        failed: "text-danger-100",
    };
</script>

<div class="px-2 pb-2 text-white">
    <div class="flex flex-wrap items-baseline justify-between gap-x-2 px-0.5 pt-0.5 text-xs">
        <span class="font-bold">{$LL.chat.file.recipient.summary({ received, total: $recipients.length })}</span>
        {#if pending > 0}
            <span class="text-warning-400">{$LL.chat.file.recipient.pending({ pending })}</span>
        {/if}
    </div>
    <ul class="list-none m-0 p-0 pt-2.5 flex flex-wrap gap-x-1.5 gap-y-2">
        {#each $recipients as recipient (recipient.spaceUserId)}
            <li
                class="w-[46px] flex flex-col items-center gap-[3px] text-center"
                title={`${recipient.name} · ${label(recipient)}`}
                data-testid="attachmentRecipient"
            >
                <span class="relative block w-9 h-9">
                    {#if recipient.state === "sending"}
                        <span
                            role="progressbar"
                            aria-label={$LL.chat.file.recipient.sending()}
                            aria-valuemin="0"
                            aria-valuemax="100"
                            aria-valuenow={Math.floor(recipient.progress * 100)}
                            class="absolute inset-0 rounded-full"
                            style={sendingRingStyle(recipient.progress)}
                        ></span>
                    {:else}
                        <span class="absolute inset-0 rounded-full box-border {ringClass[recipient.state]}"></span>
                    {/if}
                    <span
                        class="absolute inset-1 rounded-full overflow-hidden {recipient.state === 'declined'
                            ? 'opacity-45'
                            : ''}"
                    >
                        <Avatar
                            pictureStore={recipient.pictureStore}
                            fallbackName={recipient.name}
                            color={recipient.color}
                            compact
                        />
                    </span>
                    {#if recipient.state !== "sending"}
                        <span
                            class="absolute -right-[3px] -bottom-[3px] w-[15px] h-[15px] rounded-full border-2 border-solid border-secondary flex items-center justify-center text-[10px] font-bold
                                {recipient.state === 'waiting' ? 'bg-warning text-contrast-900' : ''}
                                {recipient.state === 'received' ? 'bg-success text-contrast-900' : ''}
                                {recipient.state === 'declined' ? 'bg-contrast-900 text-white' : ''}
                                {recipient.state === 'failed' ? 'bg-danger text-contrast-900' : ''}"
                            aria-hidden="true"
                        >
                            {#if recipient.state === "waiting"}
                                <IconClock font-size="9" />
                            {:else if recipient.state === "received"}
                                <IconCheck font-size="9" />
                            {:else if recipient.state === "declined"}
                                <IconX font-size="8" />
                            {:else}
                                !
                            {/if}
                        </span>
                    {/if}
                </span>
                <span class="text-[11px] max-w-full truncate">{recipient.name}</span>
                <span class="text-[10px] leading-tight {labelClass[recipient.state]}">{label(recipient)}</span>
            </li>
        {/each}
    </ul>
</div>
