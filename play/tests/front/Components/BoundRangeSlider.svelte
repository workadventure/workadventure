<script lang="ts">
    import RangeSlider from "../../../src/front/Components/Input/RangeSlider.svelte";

    // A parent binding a property that is not set yet, e.g. an area saved without a width.
    let value: number | undefined = $state(undefined);
</script>

<RangeSlider label="Width" min={15} max={85} bind:value />
