<script lang="ts">
    import { panzoom, type Options as PanZoomOptions } from "svelte-pan-zoom";
    import { asError } from "catch-unknown";
    import type { ImageCoWebsite } from "../../WebRtc/CoWebsite/ImageCoWebsite";
    import LL from "../../../i18n/i18n-svelte";
    import { IconExternalLink, IconMinus, IconPlus } from "@wa-icons";

    export let actualCowebsite: ImageCoWebsite;
    export let visible: boolean;

    let canvas: HTMLCanvasElement | undefined;
    let image: HTMLImageElement | undefined;
    let isLoading = false;
    let hasError = false;
    let loadedUrl: string | undefined;

    function render(ctx: CanvasRenderingContext2D): void {
        if (!image) {
            return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);
    }

    async function loadImage(nextUrl: string): Promise<void> {
        isLoading = true;
        hasError = false;
        image = undefined;

        const nextImage = new Image();
        nextImage.decoding = "async";

        try {
            await new Promise<void>((resolve, reject) => {
                nextImage.onload = () => resolve();
                nextImage.onerror = (e) => reject(asError(e));
                nextImage.src = nextUrl;
            });
            image = nextImage;
        } catch (e) {
            hasError = true;
            throw e;
        } finally {
            isLoading = false;
        }
    }

    function dispatchWheelZoom(deltaY: number): void {
        if (!canvas) {
            return;
        }

        const bounds = canvas.getBoundingClientRect();
        const event = new WheelEvent("wheel", {
            deltaY,
            clientX: bounds.left + bounds.width / 2,
            clientY: bounds.top + bounds.height / 2,
            bubbles: true,
            cancelable: true,
        });

        canvas.dispatchEvent(event);
    }

    function zoomIn(): void {
        dispatchWheelZoom(-160);
    }

    function zoomOut(): void {
        dispatchWheelZoom(160);
    }

    function openInNewTab(): void {
        window.open(imageUrl, "_blank", "noopener,noreferrer");
    }

    $: imageUrl = actualCowebsite.getUrl().toString();
    $: viewerOptions =
        image === undefined
            ? undefined
            : ({
                  width: image.naturalWidth,
                  height: image.naturalHeight,
                  padding: 48,
                  maxZoom: 12,
                  friction: 0.9,
                  render,
              } satisfies PanZoomOptions);

    $: if (imageUrl && imageUrl !== loadedUrl) {
        loadedUrl = imageUrl;
        loadImage(imageUrl).catch((e) => {
            console.error("Failed to load image co-website", e);
        });
    }
</script>

<div class="relative h-full w-full overflow-hidden bg-black" class:hidden={!visible}>
    <div
        class="absolute bottom-2 right-2 z-10 bg-contrast/80 rounded pointer-events-auto p-1 backdrop-blur hover:bg-contrast/100"
    >
        <div class="flex flex-col justify-center gap-2">
            <div class="flex flex-col justify-center gap-1">
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                    class="group flex justify-center items-center p-1 rounded hover:bg-white/30 cursor-pointer"
                    on:click={zoomIn}
                >
                    <IconPlus />
                    <div
                        class="-right-60 opacity-0 group-hover:opacity-90 group-hover:right-11 absolute bg-contrast backdrop-blur text-sm px-2 py-1 rounded whitespace-nowrap transition-all text-white pointer-events-none select-none"
                    >
                        {$LL.mapEditor.explorer.zoomIn()}
                    </div>
                </div>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                    class="group flex justify-center items-center p-1 rounded hover:bg-white/30 cursor-pointer"
                    on:click={zoomOut}
                >
                    <IconMinus />
                    <div
                        class="-right-60 opacity-0 group-hover:opacity-90 group-hover:right-11 absolute bg-contrast backdrop-blur text-sm px-2 py-1 rounded whitespace-nowrap transition-all text-white pointer-events-none select-none"
                    >
                        {$LL.mapEditor.explorer.zoomOut()}
                    </div>
                </div>
            </div>
            {#if !actualCowebsite.getHideUrl()}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                    class="group flex justify-center items-center p-1 rounded hover:bg-white/30 cursor-pointer"
                    on:click={openInNewTab}
                >
                    <IconExternalLink />
                    <div
                        class="-right-60 opacity-0 group-hover:opacity-90 group-hover:right-11 absolute bg-contrast backdrop-blur text-sm px-2 py-1 rounded whitespace-nowrap transition-all text-white pointer-events-none select-none"
                    >
                        {$LL.chat.imagePreview.openInNewTab()}
                    </div>
                </div>
            {/if}
        </div>
    </div>

    {#if viewerOptions}
        {#key `${imageUrl}`}
            <canvas
                bind:this={canvas}
                use:panzoom={viewerOptions}
                class="relative h-full w-full select-none touch-none"
                aria-label={$LL.chat.imagePreview.label()}
            />
        {/key}
    {:else if isLoading}
        <div class="relative flex h-full items-center justify-center text-sm text-white/80">
            {$LL.chat.imagePreview.loading()}
        </div>
    {:else if hasError}
        <div class="relative flex h-full items-center justify-center px-6 text-center text-sm text-white/80">
            {$LL.chat.imagePreview.loadError()}
        </div>
    {/if}
</div>

<style>
    canvas {
        box-sizing: border-box;
        display: block;
        overscroll-behavior: none;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
    }
</style>
