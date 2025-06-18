<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { IconX } from "@wa-icons";
    export let dataTestId: string | undefined = undefined;
    export let id: string | undefined = undefined;
    export let bgColor = "bg-white/20";
    export let hoverColor = "bg-white/30";
    export let textColor = "text-white";

    export let size: "xs" | "sm" | "md" | "lg" = "lg";

    $: sizeClasses =
        size === "xs"
            ? "h-6 w-6 text-sm"
            : size === "sm"
            ? "h-8 w-8 text-base"
            : size === "md"
            ? "h-10 w-10 text-lg"
            : "h-12 w-12 text-2xl";

    const dispatch = createEventDispatcher<{
        click: void;
    }>();

    function handleClick(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        dispatch("click");
    }
</script>

<button
    type="button"
    {id}
    class="{sizeClasses} flex items-center justify-center rounded backdrop-blur close-window transition-all aspect-square text-2xl {textColor} {bgColor} hover:{hoverColor} close-btn"
    data-testid={dataTestId}
    on:click={handleClick}
>
    <IconX />
</button>
