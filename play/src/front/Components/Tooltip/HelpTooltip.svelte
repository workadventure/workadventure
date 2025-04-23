<script lang="ts">
    import { fly } from "svelte/transition";
    import tooltipArrow from "../images/arrow-top.svg";
    export let helpMedia: string | null = null;
    export let hasImage = true;
    export let hasDesc = true;
    export let title = "Find people and navigate to them";
    export let desc =
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
    export let delayBeforeAppear = 500;
</script>

<link rel="preload" as="image" href={tooltipArrow} />
<div
    class=" hidden sm:block absolute {hasImage && hasDesc
        ? 'w-64'
        : 'min-w-[128px] text-center'} z-[500] text-white rounded-lg top-[70px] -left-2 transform before:content-[''] before:absolute before:w-full before:h-full before:z-1 before:left-0 before:top-0 before:rounded-lg before:bg-contrast/80 before:backdrop-blur after:content-[''] after:absolute after:z-0 after:w-full after:bg-transparent after:h-full after:-top-4 after:-left-0"
    in:fly={{ delay: delayBeforeAppear, y: 40, duration: 150 }}
>
    <img
        alt="Sub menu arrow"
        loading="eager"
        src={tooltipArrow}
        class="content-[''] absolute -top-1 left-9 m-auto w-2 h-1"
    />
    <div class="relative z-10 pb-4 rounded-lg overflow-hidden">
        {#if helpMedia}
            {#if helpMedia.endsWith(".mp4")}
                <video autoplay muted loop class="w-full -mt-[2px]">
                    <source src={helpMedia} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            {:else}
                <img alt="Help GIF" src={helpMedia} class="w-full -mt-[2px]" loading="lazy" />
            {/if}
        {/if}
        <div class="text-lg bold px-4 pt-2 leading-5 {hasImage && hasDesc ? 'pb-1' : ''}">
            {title}
        </div>
        {#if hasDesc}
            <div class="px-4 text-xs italic opacity-80 leading-4">
                {desc}
            </div>
        {/if}
    </div>
</div>
