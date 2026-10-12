<script lang="ts">
    import type { Readable } from "svelte/store";
    import type { ChatAttachmentRecipient } from "../../../Connection/ChatConnection";
    import LL from "../../../../../i18n/i18n-svelte";

    interface Props {
        recipients: Readable<ChatAttachmentRecipient[]>;
    }

    let { recipients }: Props = $props();
</script>

<ul class="list-none m-0 px-2 pb-2 flex flex-col gap-1 text-xxs text-white/80">
    {#each $recipients as recipient (recipient.spaceUserId)}
        <li class="flex items-center gap-2" data-testid="attachmentRecipient">
            <span class="truncate flex-1">{recipient.name}</span>
            {#if recipient.state === "sending"}
                <progress class="w-20" max="1" value={recipient.progress} aria-label={$LL.chat.file.recipient.sending()}
                ></progress>
            {:else}
                <span>{$LL.chat.file.recipient[recipient.state]()}</span>
            {/if}
        </li>
    {/each}
</ul>
