<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let classNames:string|undefined = undefined
    export let imageSource:string;
    export let imageAlt:string;
    let imageElementRef: HTMLImageElement;

    function retryImageLoading() {
        imageElementRef.src = imageSource;
    }

    const dispatch = createEventDispatcher();


</script>

<img
    class={classNames}
    src={imageSource}
    alt={imageAlt}
    on:load={()=>dispatch("onImageLoad",imageElementRef)}
    bind:this={imageElementRef}
    on:error={() => retryImageLoading()}
/>
