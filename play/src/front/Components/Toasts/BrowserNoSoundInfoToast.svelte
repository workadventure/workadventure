<script lang="ts">
    import { onMount } from "svelte";
    import type { Unsubscriber } from "svelte/store";
    import { LL } from "../../../i18n/i18n-svelte";
    import { requestedStatusStore } from "../../Stores/MediaStore";
    import { toastStore } from "../../Stores/ToastStore";
    import { userActivationManager } from "../../Stores/UserActivationStore";
    import { audioContextManager } from "../../WebRtc/AudioContextManager";
    import { isNotSuspendedAudioContextStore } from "../../Stores/AudioContextStore";
    import ToastContainer from "./ToastContainer.svelte";

    export let toastUuid: string;

    let isNotSuspendedAudioContextStoreSubscription: Unsubscriber | undefined;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    function closeToast(): void {
        // Unsubscribe from the store
        isNotSuspendedAudioContextStoreSubscription?.();
        isNotSuspendedAudioContextStoreSubscription = undefined;

        // Clear the interval
        if (intervalId !== undefined) {
            clearInterval(intervalId);
            intervalId = undefined;
        }

        // Notify the user that the user has allowed to play sound
        userActivationManager.notifyUserActivation();
        // Set the user status to ONLINE
        requestedStatusStore.set(null); //⚠️ Define to null is like set to ONLINE
        // Remove the toast
        toastStore.removeToast(toastUuid);
        // Set is not suspended audio context store to false
        isNotSuspendedAudioContextStore.set(true);
    }

    onMount(() => {
        // We need to check if the context is still suspended or not.
        // Unfortunately, the onstatechange event is not triggered when the context is running.
        intervalId = setInterval(() => {
            if (!audioContextManager.verifyContextIsNotSuspended()) {
                return;
            }
            // The context is not suspended, so we need to close the toast
            closeToast();
        }, 500);

        isNotSuspendedAudioContextStoreSubscription = isNotSuspendedAudioContextStore.subscribe((isNotSuspended) => {
            if (!isNotSuspended) return;
            // The context is not suspended, so we need to close the toast
            closeToast();
        });

        return () => {
            if (intervalId !== undefined) clearInterval(intervalId);
            isNotSuspendedAudioContextStoreSubscription?.();
        };
    });
</script>

<ToastContainer extraClasses="w-full min-w-72 max-w-sm sm:min-w-80 sm:max-w-md" theme="secondary" {toastUuid}>
    <div class="flex flex-col gap-2">
        <p class="m-0 text-sm leading-snug text-white text-center">
            {$LL.statusModal.soundBlockedBackInAMoment()}
        </p>
    </div>
    <svelte:fragment slot="buttons">
        <button
            type="button"
            class="btn btn-secondary btn-sm flex-1"
            data-testid="do-not-disturb-activate"
            on:click|stopPropagation|preventDefault={closeToast}
        >
            {$LL.statusModal.turnSoundOn()}
        </button>
    </svelte:fragment>
</ToastContainer>
