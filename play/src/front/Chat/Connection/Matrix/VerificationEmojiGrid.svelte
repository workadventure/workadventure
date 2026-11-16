<script lang="ts">
    import type { EmojiMapping } from "matrix-js-sdk/lib/crypto-api";
    import LL from "../../../../i18n/i18n-svelte";

    interface Props {
        emojis: EmojiMapping[];
        // Once the user confirmed, the tiles fade so the eye moves to the waiting message.
        confirmed?: boolean;
    }

    let { emojis, confirmed = false }: Props = $props();

    function emojiLabel(label: string): string {
        const labels = $LL.chat.emojis as unknown as Record<string, (() => string) | undefined>;
        return labels[label]?.() ?? $LL.chat.emojis.unknownLabel();
    }
</script>

<!-- 4 + 3 tiles on two centred rows, the way Element lays out the 7 SAS emojis. -->
<ol
    aria-label={$LL.chat.verificationEmojiDialog.emojiListLabel()}
    class="m-0 p-0 list-none flex flex-wrap justify-center gap-3 w-full transition-opacity {confirmed
        ? 'opacity-50'
        : ''}"
    data-testid="verificationEmojiGrid"
>
    {#each emojis as [emoji, label], index (index)}
        <li
            class="w-[132px] flex flex-col items-center gap-2 pt-3.5 pb-3 rounded-xl bg-white/5 border border-solid border-white/10"
        >
            <span class="text-[44px] leading-none" aria-hidden="true">{emoji}</span>
            <span class="text-base text-white/85">{emojiLabel(label)}</span>
        </li>
    {/each}
</ol>
