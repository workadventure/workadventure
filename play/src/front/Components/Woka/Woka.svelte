<script lang="ts">
    interface Props {
        src: string;
        customWidth?: string;
        grayscale?: boolean;
    }

    let { src, customWidth = undefined, grayscale = false }: Props = $props();
</script>

<img
    {src}
    alt=""
    class="noselect"
    class:grayscale
    style={customWidth ? `--theme-width: ${customWidth};` : ""}
    draggable="false"
    ondragstart={(event) => {
        event.preventDefault();
        return false;
    }}
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
