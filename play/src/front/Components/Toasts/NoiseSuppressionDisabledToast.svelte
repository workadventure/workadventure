<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { mediaSettingsOpenStore } from "../../Stores/MenuStore";
    import { toastStore } from "../../Stores/ToastStore";
    import ToastContainer from "./ToastContainer.svelte";

    export let toastUuid: string;

    function handleOpenSettings(): void {
        mediaSettingsOpenStore.set(true);
        closeToast();
    }

    function closeToast(): void {
        setTimeout(() => {
            toastStore.removeToast(toastUuid);
        }, 0);
    }
</script>

<ToastContainer
    extraClasses="w-full min-w-72 max-w-sm sm:min-w-80 sm:max-w-md"
    theme="error"
    duration={10000}
    {toastUuid}
>
    <div class="flex flex-col gap-2">
        <p class="m-0 text-sm leading-snug text-white text-center">
            {$LL.actionbar.microphone.noiseSuppressionAutoDisabled()}
        </p>
    </div>
    <svelte:fragment slot="buttons">
        <button type="button" class="btn btn-ghost btn-sm flex-1" on:click|stopPropagation|preventDefault={closeToast}>
            {$LL.actionbar.close()}
        </button>
        <button
            type="button"
            class="btn btn-danger btn-sm flex-1"
            on:click|stopPropagation|preventDefault={handleOpenSettings}
        >
            {$LL.actionbar.microphone.openSettings()}
        </button>
    </svelte:fragment>
</ToastContainer>
