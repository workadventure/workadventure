<script lang="ts">
    import type { Snippet } from "svelte";

    let { title, hint, children }: { title: string; hint?: string; children: Snippet } = $props();
    const id = $props.id();
</script>

<!-- The Landing's glass card. -->
<section
    aria-labelledby={id}
    class="flex flex-col gap-3 rounded-[14px] border border-card-border bg-card px-5 pt-4 pb-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)]"
>
    <div>
        <h2 {id} class="font-title text-[15px] font-medium tracking-[0.05em] uppercase">{title}</h2>
        {#if hint}
            <p class="mt-1 text-[13px] leading-[1.5] text-muted">{hint}</p>
        {/if}
    </div>
    {@render children()}
</section>
