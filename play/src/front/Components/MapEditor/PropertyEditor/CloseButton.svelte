<script lang="ts">
    interface Props {
        onclick?: (event: MouseEvent) => void;
    }

    let { onclick }: Props = $props();
</script>

<button
    class="close-button"
    onclick={(event) => {
        onclick?.(event);
    }}
>
    x
</button>

<style lang="scss">
    .close-button {
        position: absolute;
        padding: 3px;
        border-radius: 8px;
        top: 0;
        inset-inline-end: 0;
        cursor: pointer;
    }
</style>
