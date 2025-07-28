<script lang="ts">
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
    import { WokaData, WokaTexture } from "./WokaTypes";

    const dispatch = createEventDispatcher<{ rotate: { direction: number } }>();

    export let selectedTextures: Record<string, string>;
    export let wokaData: WokaData | null = null;
    export let getTextureUrl: (url: string) => string = (url) => url;

    const bodyPartOrder = ["body", "eyes", "hair", "clothes", "hat", "accessory", "woka"];

    // Directions correspond to the order of images in the sprite sheet:
    const directionsCoresp = [0, 1, 3, 2];

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    let images: Record<string, HTMLImageElement> = {};
    let frame: number = 0;
    let direction: number = 0;
    let raf: number;
    let frameCount: number = 0;
    const framesPerStep = 15;
    const canvaSize = 130;

    function findTextureUrl(bodyPart: string): string | null {
        const textureId = selectedTextures?.[bodyPart];
        if (!textureId || !wokaData?.[bodyPart]?.collections) return null;
        for (const collection of wokaData[bodyPart].collections) {
            const texture = collection.textures.find((t: WokaTexture) => t.id === textureId);
            if (texture) return getTextureUrl(texture.url);
        }
        return null;
    }

    function loadImages() {
        images = {};
        for (const part of bodyPartOrder) {
            const url = findTextureUrl(part);
            if (url) {
                const img = new window.Image();
                img.src = url;
                images[part] = img;
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const part of bodyPartOrder) {
            const img = images[part];
            ctx.imageSmoothingEnabled = false;
            if (img && img.complete) {
                ctx.drawImage(img, frame * 32, directionsCoresp[direction] * 32, 32, 32, 0, 0, canvaSize, canvaSize);
            }
        }
    }

    function animate() {
        frameCount++;
        if (frameCount >= framesPerStep) {
            frame = (frame + 1) % 3;
            frameCount = 0;
        }
        draw();
        raf = requestAnimationFrame(animate);
    }

    $: if (selectedTextures) {
        loadImages();
    }

    onMount(() => {
        const context = canvas.getContext("2d");
        if (!context) return;
        ctx = context;
        loadImages();
        animate();
    });
    onDestroy(() => {
        cancelAnimationFrame(raf);
    });
</script>

<div class="woka-preview flex items-center justify-center relative">
    <div class="p-6 relative flex items-center justify-center w-fit bg-white/10 rounded-lg">
        <button
            class="bg-white/10 hover:bg-white/20 rounded-md absolute bottom-2 right-2 aspect-square p-2 flex items-center justify-center"
            on:click={() => {
                direction = (direction + 1) % 4;
                dispatch("rotate", { direction: directionsCoresp[direction] });
            }}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="icon icon-tabler icons-tabler-outline icon-tabler-reload"
                ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
                    d="M19.933 13.041a8 8 0 1 1 -9.925 -8.788c3.899 -1 7.935 1.007 9.425 4.747"
                /><path d="M20 4v5h-5" /></svg
            >
        </button>
        <canvas
            bind:this={canvas}
            width={canvaSize}
            height={canvaSize}
            style="image-rendering: pixelated;"
            class="z-500"
        />
    </div>
</div>
