<script lang="ts">
    import { IconLoader, IconPhotoOff } from "@tabler/icons-svelte";
    import { createEventDispatcher } from "svelte";

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

    const dispatch = createEventDispatcher();
</script>

{#if imageRetry}
    <div class="tw-flex tw-items-center tw-justify-center tw-flex-1" data-testid="entityImageLoader">
        <IconLoader class="tw-animate-spin" />
    </div>
{/if}

{#if imageError}
    <div class="tw-flex tw-items-center tw-justify-center tw-flex-1" data-testid="entityImageError">
        <IconPhotoOff />
    </div>
{/if}

<img
    loading="lazy"
    class={`${classNames} ${imageRetry || imageError ? "tw-invisible tw-flex-[0_1_0]" : "tw-visible"}`}
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
