<script lang="ts">
    import { fly } from "svelte/transition";
    import { LL } from "../../../i18n/i18n-svelte";

    let showMobileInformation: boolean = false;
</script>

<!-- Use "showMobileInformation" to restrict the visibility for the mobile experience -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="absolute -top-[50px] max-sm:w-full @sm/actions:!top-20 left-0 z-0 text-white border border-solid border-danger flex flex-col items-center justify-between bg-no-repeat bg-center bg-danger-1000/70 backdrop-blur rounded-lg text-center transition-all"
    transition:fly={{ y: 30, duration: 400 }}
    on:click={() => (showMobileInformation = !showMobileInformation)}
    class:!-top-[200px]={showMobileInformation}
>
    <div class="py-2 px-1">
        <div class="m-0 text-center text-base bold">
            {$LL.camera.my.silentZone()} 🤐
        </div>
        <div class="text-danger-200 text-xs max-sm:hidden" class:!block={showMobileInformation}>
            {$LL.camera.my.silentZoneDesc()}
        </div>
    </div>
</div>
