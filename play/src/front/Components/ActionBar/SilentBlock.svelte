<script lang="ts">
    import { fly } from "svelte/transition";
    import { LL } from "../../../i18n/i18n-svelte";
</script>

<div
    class="absolute -top-[210px] @sm/actions:top-20 left-0 z-0 text-white border border-solid border-danger flex flex-col items-center justify-between bg-no-repeat bg-center bg-danger-1000/70 backdrop-blur rounded-lg text-center"
    transition:fly={{ y: 30, duration: 400 }}
>
    <div class="py-2 px-1">
        <div class="m-0 text-center text-base bold">
            {$LL.camera.my.silentZone()} 🤐
        </div>
        <div class="text-danger-400 text-xs">
            {$LL.camera.my.silentZoneDesc()}
        </div>
    </div>
</div>
