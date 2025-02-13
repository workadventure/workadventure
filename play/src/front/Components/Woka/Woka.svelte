<script lang="ts">
    export let src: string;
    export let customWidth: string | undefined = undefined;
    export let customHeight: string | undefined = undefined;
    let width = "64px";
    let height = "64px";

    function noDrag() {
        return false;
    }
</script>

<img
    {src}
    alt=""
    class="noselect"
    style="--theme-width: {customWidth ?? width}; --theme-height: {customHeight ?? height} image-rendering: pixalated"
    draggable="false"
    on:dragstart|preventDefault={noDrag}
/>

<style lang="scss">
    img {
        display: inline-block;
        pointer-events: auto;
        width: var(--theme-width);
        height: var(--theme-height);
        margin: 0;
        padding: 0;
        position: static;
        left: 0;
        bottom: 0;
        right: 0;
        top: 0;
        image-rendering: pixelated;
    }
</style>
