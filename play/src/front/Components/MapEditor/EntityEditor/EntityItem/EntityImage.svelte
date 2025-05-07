<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { IconLoader, IconPhotoOff } from "@wa-icons";

    export let classNames: string | undefined = undefined;
    export let imageSource: string;
    export let imageAlt: string;
    let imageElementRef: HTMLImageElement;
    let imageRetry = false;
    let imageError = false;
    let MAX_RETRY = 10;
    let retry = 0;

    function retryImageLoading() {
        imageRetry = true;
        if (retry <= MAX_RETRY) {
            setTimeout(() => {
                imageElementRef.src = imageSource;
                retry += 1;
            }, 500);
        } else {
            imageRetry = false;
            imageError = true;
        }
    }

    const dispatch = createEventDispatcher<{
        onImageLoad: HTMLImageElement;
    }>();
</script>

{#if imageRetry}
    <div class="flex items-center justify-center flex-1" data-testid="entityImageLoader">
        <IconLoader class="animate-spin" />
    </div>
{/if}

{#if imageError}
    <div class="flex items-center justify-center flex-1" data-testid="entityImageError">
        <IconPhotoOff />
    </div>
{/if}

<img
    loading="lazy"
    class={`${classNames} ${imageRetry || imageError ? "invisible flex-[0_1_0]" : "visible"}`}
    style="image-rendering: pixelated"
    src={imageSource}
    alt={imageAlt}
    on:load={() => {
        dispatch("onImageLoad", imageElementRef);
        imageError = false;
        imageRetry = false;
    }}
    bind:this={imageElementRef}
    on:error={() => retryImageLoading()}
/>
