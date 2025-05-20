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
    export let shortcuts: string[] = [];
</script>

<link rel="preload" as="image" href={tooltipArrow} />
<div
    class="sm:block absolute p-1.5 {hasImage && hasDesc
        ? 'w-64'
        : 'min-w-[128px] text-center'} z-[500] text-white rounded-lg top-[70px] -start-2 transform before:content-[''] before:absolute before:w-full before:h-full before:z-1 before:start-0 before:top-0 before:rounded-lg before:bg-contrast/80 before:backdrop-blur after:content-[''] after:absolute after:z-0 after:w-full after:bg-transparent after:h-full after:-top-4 after:-start-0"
    in:fly={{ delay: delayBeforeAppear, y: 40, duration: 150 }}
>
    <img
        alt="Sub menu arrow"
        loading="eager"
        src={tooltipArrow}
        class="content-[''] absolute -top-1 start-9 m-auto w-2 h-1"
    />
    <div class="relative z-10 pb-3 overflow-hidden flex flex-col gap-2">
        {#if helpMedia}
            {#if helpMedia.endsWith(".mp4")}
                <video autoplay muted loop class="w-full rounded-md">
                    <source src={helpMedia} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            {:else}
                <img alt="Help GIF" src={helpMedia} class="w-full rounded-md" loading="lazy" />
            {/if}
        {/if}
        <div class="flex flex-col gap-2 items-start px-1 pt-1 ">
            <div class="flex flex-row items-start justify-between w-full">
                <div class="text-lg bold leading-none">
                    {title}
                </div>
                {#if shortcuts.length > 0}
                    <div class="ps-4 text-xs opacity-80 pb-1 flex flex-row items-center gap-1">
                        {#each shortcuts as shortcut, index (index)}
                            <div
                                class="text-sm h-[26px] leading-none font-bold p-1.5 rounded border border-solid border-white/50 flex items-center justify-center w-fit shadow-white/50 shadow-[0_2px_0px_rgba(0,0,0,0.50)] mb-[2px] {shortcut.length <
                                2
                                    ? ' aspect-square'
                                    : ''}"
                            >
                                {shortcut}
                            </div>
                            {#if index < shortcuts.length - 1}
                                <span class="text-sm font-bold"> + </span>
                            {/if}
                        {/each}
                    </div>
                {/if}
            </div>
            {#if hasDesc}
                <div class="text-xs italic opacity-80">
                    {desc}
                </div>
            {/if}
        </div>
    </div>
</div>
