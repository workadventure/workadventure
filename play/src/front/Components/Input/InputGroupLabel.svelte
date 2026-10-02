<script lang="ts">
    import type { Snippet } from "svelte";

    // Labels a GROUP of fields, referenced through aria-labelledby. Single fields
    // get their label from Input/TextArea instead, which render .input-label themselves.
    interface Props {
        id: string;
        size?: "sm";
        variant?: "light";
        inline?: boolean;
        class?: string;
        children?: Snippet;
    }

    let {
        id,
        size = undefined,
        variant = undefined,
        inline = false,
        class: className = "",
        children,
    }: Props = $props();
</script>

<div
    {id}
    class="input-label {className}"
    class:input-label-sm={size === "sm"}
    class:input-label-light={variant === "light"}
    class:input-label-inline={inline}
>
    {@render children?.()}
</div>
