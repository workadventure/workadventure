<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { textMessageStore } from "../../Stores/TypeMessageStore/TextMessageStore";
    import TextMessage from "./TextMessage.svelte";

    // The newest announcement is shown; the others wait behind it, closing it reveals the next one.
    let latest = $derived($textMessageStore.at(-1));
    let waiting = $derived($textMessageStore.length - 1);
</script>

{#if latest}
    <!-- Below the action bar rather than over it. -->
    <div class="fixed left-0 right-0 top-20 w-full z-[900] pointer-events-none px-2 flex flex-col items-center gap-2">
        {#key latest.id}
            <TextMessage message={latest} />
        {/key}
        {#if waiting > 0}
            <span class="pointer-events-auto rounded-full bg-contrast/90 text-white text-xs px-3 py-1">
                {$LL.megaphone.announcement.more({ count: waiting })}
            </span>
        {/if}
    </div>
{/if}
