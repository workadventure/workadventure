<script lang="ts">
    export let src: string;
    export let customWidth: string | undefined = undefined;
    export let grayscale = false;

    function noDrag() {
        return false;
    }
</script>

<img
    {src}
    alt=""
    class="noselect"
    class:grayscale
    style="    {customWidth ? `--theme-width: ${customWidth};` : ''}"
    draggable="false"
    on:dragstart|preventDefault={noDrag}
/>

<style lang="scss">
    img {
        display: inline-block;
        pointer-events: auto;
        width: var(--theme-width);
        margin: 0;
        padding: 0;
        position: static;
        inset-inline-start: 0;
        bottom: 0;
        inset-inline-end: 0;
        top: 0;
        image-rendering: pixelated;
    }
</style>
