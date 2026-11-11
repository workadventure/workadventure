<script lang="ts">
    import type { HTMLInputAttributes } from "svelte/elements";

    let {
        id,
        label,
        value = $bindable(""),
        input = $bindable(),
        ...rest
    }: HTMLInputAttributes & { id: string; label: string; input?: HTMLInputElement } = $props();
</script>

<div class="mt-[clamp(6px,1vw,14px)]">
    <label for={id} class="mb-[7px] block text-[12px] text-muted">{label}</label>
    <input
        {id}
        bind:value
        bind:this={input}
        {...rest}
        class="h-10 w-full rounded-[9px] border border-white/10 bg-[rgb(6_13_26/0.55)] px-[13px] text-[13px] text-white outline-none transition-[border-color,box-shadow] duration-140 placeholder:text-[#64748b] focus-visible:border-[rgb(139_143_255/0.85)] focus-visible:shadow-[0_0_0_3px_rgb(91_95_240/0.22)]"
    />
</div>
