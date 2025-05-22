<script lang="ts">
    export let colorHex: string;
    export let position: "absolute" | "relative";
    export let cursorType: "auto" | "pointer" = "auto";
    export let componentClass = "";
    export let isActive = false;
</script>

<div class="relative cursor-{cursorType} {componentClass}" style="--color:{colorHex}">
    <div
        class="h-3 w-3 bg-green cursor-{cursorType}  {position === 'absolute'
            ? `${position} -top-8 -start-4`
            : `${position} scale-70`}"
    >
        <div id="innerCircle" class="circle absolute cursor-{cursorType}  rounded-full h-2 w-2 top-0.5 start-0.5" />
        {#if isActive}
            <div
                class="circle absolute cursor-{cursorType}   rounded-full h-3 w-3 opacity-30 animate-ping top-0 start-0"
            />
        {/if}
    </div>
</div>

<style lang="scss">
    .circle {
        background-color: var(--color);
    }
</style>
