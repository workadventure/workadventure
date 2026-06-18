<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";

    let showMobileInformation: boolean = $state(false);
</script>

<!-- Use "showMobileInformation" to restrict the visibility for the mobile experience -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="mx-auto px-2 z-0 text-white border border-solid border-danger flex flex-col items-center justify-between bg-no-repeat bg-center bg-danger-1000/70 backdrop-blur rounded-lg text-center pointer-events-auto select-none"
    onclick={() => (showMobileInformation = !showMobileInformation)}
>
    <div class="py-2 px-1">
        <div class="m-0 text-center text-base bold">
            {$LL.camera.my.silentZone()} 🤐
        </div>
        <div class={["text-danger-200 text-xs", { "max-sm:hidden": !showMobileInformation }]}>
            {$LL.camera.my.silentZoneDesc()}
        </div>
    </div>
</div>
