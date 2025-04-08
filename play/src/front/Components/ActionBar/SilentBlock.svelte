<script lang="ts">
    import { fly } from "svelte/transition";
    import { LL } from "../../../i18n/i18n-svelte";
</script>

<div
    class="absolute bottom-4 w-4/5 md:w-3/4 left-1/2 max-w-screen-md -translate-x-1/2 z-[250] text-white border border-solid border-danger flex flex-col items-center justify-between bg-no-repeat bg-center bg-danger-1000/70 backdrop-blur rounded-xl text-center"
    transition:fly={{ y: 30, duration: 400 }}
>
    <div class="flex items-center justify-center relative">
        <span class="text-[100px] leading-[100px] -mt-4">🤐</span>
    </div>
    <div class="p-2">
        <div class="m-0 text-center text-lg bold">
            {$LL.camera.my.silentZone()}
        </div>
        <div class="text-danger-400 text-xs">
            {$LL.camera.my.silentZoneDesc()}
        </div>
    </div>
</div>
