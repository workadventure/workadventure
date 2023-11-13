<script lang="ts">
    import { fly } from "svelte/transition";

    import tooltipArrow from "../images/arrow-top.svg";

    export let image: string = "./static/images/tooltip-exemple.gif";
    export let title: string = "Find people and navigate to them";
    export let desc: string = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
</script>

<div class="block absolute w-64 text-white rounded-lg top-[70px] -left-2 transform before:content-[''] before:absolute before:w-full before:h-full before:z-1 before:left-0 before:top-0 before:rounded-lg before:bg-contrast/80 before:backdrop-blur after:content-[''] after:absolute after:z-0 after:w-full after:bg-transparent after:h-full after:-top-4 after:-left-0" in:fly={{delay: 500, y: 40, duration: 150 }}>
    <img loading="eager" src="{tooltipArrow}" class="content-[''] absolute -top-1 left-9 m-auto w-2 h-1" />
    <div class="relative z-10 pb-4 rounded-lg overflow-hidden">
        <img src="{image}" class="w-full -mt-[2px]" loading="lazy" />
        <div class="font-lg bold px-4 pt-3 pb-1">
            {title}
        </div>
        <div class="text-xs opacity-50 px-4">
            {desc}
        </div>
    </div>
</div>