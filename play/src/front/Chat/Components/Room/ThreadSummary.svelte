<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import type { ChatThreadSummary } from "../../Connection/ChatConnection";
    import { IconMessageCircle2 } from "@wa-icons";

    export let summary: ChatThreadSummary;

    const dispatch = createEventDispatcher<{
        openThread: undefined;
    }>();

    function openThread() {
        dispatch("openThread");
    }
</script>

<button
    type="button"
    class="mt-1.5 text-left rounded-md border border-solid border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition-colors"
    data-testid="threadSummary"
    on:click={openThread}
>
    <div class="flex items-center gap-2 text-xs font-semibold opacity-90" data-testid="threadSummaryCount">
        <IconMessageCircle2 font-size={14} />
        <span
            >{summary.replyCount === 1
                ? $LL.chat.thread.replySingular()
                : $LL.chat.thread.replyPlural({ count: summary.replyCount })}</span
        >
    </div>

    {#if summary.lastReplyPreview}
        <div class="mt-1 text-xs opacity-70 truncate max-w-[26rem]" data-testid="threadSummaryPreview">
            {#if summary.lastReplySenderName}{summary.lastReplySenderName}: {/if}{summary.lastReplyPreview}
        </div>
    {/if}
</button>
