<script lang="ts">
    import LL from "../../../../i18n/i18n-svelte";
    import { IconLoader } from "@wa-icons";

    // Alternating sides, so the placeholder reads as a conversation rather than a list.
    const BUBBLES = [
        { mine: false, width: "w-7/12" },
        { mine: false, width: "w-4/12" },
        { mine: true, width: "w-8/12" },
        { mine: false, width: "w-5/12" },
        { mine: true, width: "w-3/12" },
    ];
</script>

<!-- Fades in after 300 ms so a cache hit doesn't flash it; the label only shows past 5 s. -->
<li
    class="skeleton w-full flex flex-col gap-1 px-4 pb-3 opacity-0"
    role="status"
    aria-label={$LL.chat.timeLine.loadingMessages()}
    data-testid="roomTimelineLoading"
>
    {#each BUBBLES as bubble, index (index)}
        <div
            class="h-8 rounded-lg animate-pulse motion-reduce:animate-none {bubble.width} {bubble.mine
                ? 'self-end rounded-br-none bg-secondary/40'
                : 'self-start rounded-bl-none bg-white/10'} {index > 0 && bubble.mine !== BUBBLES[index - 1].mine
                ? 'mt-3'
                : ''}"
        ></div>
    {/each}
    <div class="slow self-center mt-3 flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm opacity-0">
        <IconLoader class="animate-[spin_2s_linear_infinite]" font-size={14} />
        {$LL.chat.timeLine.loadingMessages()}
    </div>
</li>

<style>
    .skeleton {
        animation: reveal 0s 300ms forwards;
    }
    .slow {
        animation: reveal 0s 5s forwards;
    }
    @keyframes reveal {
        to {
            opacity: 1;
        }
    }
</style>
