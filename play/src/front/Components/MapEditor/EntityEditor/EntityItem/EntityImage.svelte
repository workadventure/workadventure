<script lang="ts">
    export let classNames:string|undefined = undefined
    export let imageSource:string;
    export let imageAlt:string;
    let imageElementRef: HTMLImageElement;

    function retryImageLoading() {
        imageElementRef.src = imageSource;
    }

</script>

<img
    class={classNames}
    src={imageSource}
    alt={imageAlt}
    bind:this={imageElementRef}
    on:error={() => retryImageLoading()}
/>
