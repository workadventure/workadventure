<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { noMicrophoneSoundWarningDismissedStore } from "../../Stores/MediaStore";
    import { mediaSettingsOpenStore } from "../../Stores/MenuStore";
    import { toastStore } from "../../Stores/ToastStore";
    import ToastContainer from "./ToastContainer.svelte";

    export let toastUuid: string;

    function handleOpenSettings(): void {
        noMicrophoneSoundWarningDismissedStore.set(true);
        mediaSettingsOpenStore.set(true);
        // Remove toast on next tick so the store update is flushed and the settings panel can open first
        setTimeout(() => {
            toastStore.removeToast(toastUuid);
        }, 0);
    }
</script>

<ToastContainer extraClasses="w-full min-w-72 max-w-sm sm:min-w-80 sm:max-w-md" theme="error" {toastUuid}>
    <div class="flex flex-col gap-2">
        <p class="m-0 text-sm leading-snug text-white text-center">
            {$LL.actionbar.microphone.noSoundWarning()}
        </p>
    </div>
    <svelte:fragment slot="buttons">
        <button
            type="button"
            class="w-[40%] w-min-fit py-3 px-5 text-[15px] font-semibold text-white bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg cursor-pointer transition-all duration-200 shadow-[0_2px_8px_rgba(37,99,235,0.4)] hover:from-blue-500 hover:to-blue-600 hover:shadow-[0_4px_12px_rgba(37,99,235,0.5)] active:scale-[0.98]"
            data-testid="no-microphone-sound-open-settings"
            on:click|stopPropagation|preventDefault={handleOpenSettings}
        >
            {$LL.actionbar.microphone.openSettings()}
        </button>
    </svelte:fragment>
</ToastContainer>
