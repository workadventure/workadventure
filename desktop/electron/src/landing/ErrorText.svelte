<script lang="ts">
    // Always in the page so an error appearing does not shift the layout; `compact` takes no room
    // until there is something to say.
    let { id, message, compact = false }: { id: string; message: string; compact?: boolean } = $props();
</script>

<div
    {id}
    role="alert"
    aria-live="polite"
    class={[
        "text-[12px] leading-[1.4] text-alert",
        compact ? ["mt-1.5", message && "min-h-4"] : "mt-1 min-h-[15px]",
        !message && "invisible",
    ]}
>
    {message}
</div>
