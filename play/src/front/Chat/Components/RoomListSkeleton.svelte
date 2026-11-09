<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
</script>

<!-- Placeholder rows shaped like the room list, shown while the chat connects. -->
<div
    class="flex flex-col gap-1 px-2 py-2 border border-solid border-x-0 border-b-0 border-t border-white/10"
    role="status"
    aria-busy="true"
    data-testid="roomListSkeleton"
>
    <span class="sr-only">{$LL.chat.connecting()}</span>
    {#each ["w-3/4", "w-1/2", "w-2/3", "w-3/5"] as width (width)}
        <div class="flex items-center gap-2 p-2" aria-hidden="true">
            <div class="size-7 shrink-0 rounded-md bg-white/10 motion-safe:animate-pulse"></div>
            <div class="h-3 rounded bg-white/10 motion-safe:animate-pulse {width}"></div>
        </div>
    {/each}
</div>
