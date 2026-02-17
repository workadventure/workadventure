<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { mediaSettingsOpenStore } from "../../Stores/MenuStore";
    import { toastStore } from "../../Stores/ToastStore";
    import { noMicrophoneSoundWarningDismissedStore } from "../../Stores/NoMicrophoneSoundWarningVisibleStore";
    import ToastContainer from "./ToastContainer.svelte";

    export let toastUuid: string;

    function handleOpenSettings(): void {
        mediaSettingsOpenStore.set(true);
        // Remove toast on next tick so the store update is flushed and the settings panel can open first
        setTimeout(() => {
            closeToast();
        }, 0);
    }

    function closeToast(): void {
        noMicrophoneSoundWarningDismissedStore.set(true);
        toastStore.removeToast(toastUuid);
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
            class="btn btn-secondary"
            data-testid="no-microphone-sound-open-settings"
            on:click|stopPropagation|preventDefault={handleOpenSettings}
        >
            {$LL.actionbar.microphone.openSettings()}
        </button>
        <button
            type="button"
            class="btn btn-light"
            data-testid="no-microphone-sound-ignore"
            on:click|stopPropagation|preventDefault={closeToast}
        >
            {$LL.actionbar.microphone.ignore()}
        </button>
    </svelte:fragment>
</ToastContainer>
