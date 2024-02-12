<script lang="ts">
    export let colorHex: string;
    export let position: "absolute" | "relative";
</script>

<div class="tw-relative" style="--color:{colorHex}">
    <div
        class="tw-h-5 tw-w-5 tw-bg-green {position === 'absolute'
            ? `tw-${position} tw--top-8 tw--left-4`
            : `tw-${position} tw-scale-70`}"
    >
        <div
            id="innerCircle"
            class="circle tw-absolute  tw-rounded-full tw-h-5 tw-w-5  tw-scale-[0.7] tw-bg-opacity-80"
        />
        <div class="circle tw-absolute  tw-rounded-full tw-h-5 tw-w-5 tw-bg-opacity-30" />
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
