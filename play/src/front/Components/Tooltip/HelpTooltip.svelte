<script lang="ts">
    import { fly } from "svelte/transition";
    import tooltipArrow from "../images/arrow-top.svg";
    export let hasImage = true;
    export let hasDesc = true;
    export let image = "./static/images/tooltip-exemple.gif";
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
    <div class="relative z-10 p-2 rounded-lg overflow-hidden min-w-48">
        {#if hasImage}
            <img alt="Help GIF" src={image} class="w-full -mt-[2px] rounded-md" loading="lazy" />
        {/if}
        <div class="text-lg bold pt-2 leading-5 text-nowrap text-left {hasImage && hasDesc ? 'pb-1' : ''}">
            {title}
        </div>
        {#if hasDesc}
            <div class="text-xs italic opacity-80 leading-4 text-left pt-1">
                {desc}
            </div>
        {/if}
        <slot name="end" />
    </div>
</div>
