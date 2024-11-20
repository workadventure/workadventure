<script lang="ts">
    export let colorHex: string;
    export let position: "absolute" | "relative";
    export let cursorType: "auto" | "pointer" = "auto";
    export let componentClass = "";
</script>

<div class="relative cursor-{cursorType} {componentClass}" style="--color:{colorHex}">
    <div
        class="h-5 w-5 bg-green cursor-{cursorType}  {position === 'absolute'
            ? `${position} -top-8 -left-4`
            : `${position} scale-70`}"
    >
        <div
            id="innerCircle"
            class="circle absolute cursor-{cursorType}  rounded-full h-5 w-5 scale-[0.7] bg-opacity-80"
        />
        <div class="circle absolute cursor-{cursorType}   rounded-full h-5 w-5 bg-opacity-30" />
    </div>
</div>

<style lang="scss">
    .circle {
        background-color: var(--color);
        height: 20px;
        width: 20px;
        border-radius: 50%;
        opacity: 0.3;
    }

    #innerCircle {
        transform: scale(0.7);
        opacity: 0.8;
    }
</style>
