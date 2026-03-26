<script lang="ts">
    import { onMount } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { requestedStatusStore } from "../../Stores/MediaStore";
    import { toastStore } from "../../Stores/ToastStore";
    import { userActivationManager } from "../../Stores/UserActivationStore";
    import { audioContextManager } from "../../WebRtc/AudioContextManager";
    import ToastContainer from "./ToastContainer.svelte";

    export let toastUuid: string;

    function handleActivate(): void {
        // Check that the user has allowed to play sound
        if (!audioContextManager.verifyContextIsNotSuspended()) {
            return;
        }

        userActivationManager.notifyUserActivation();
        requestedStatusStore.set(null); //⚠️ Define to null is like set to ONLINE
        toastStore.removeToast(toastUuid);
    }

    onMount(() => {
        // We need to check if the context still suspended or not.
        // Unfortunelly, the onstatechange event is not triggered when the context is running.
        const interval = setInterval(() => {
            handleActivate();
        }, 1000);
        return () => clearInterval(interval);
    });
</script>

<ToastContainer extraClasses="w-full min-w-72 max-w-sm sm:min-w-80 sm:max-w-md" theme="secondary" {toastUuid}>
    <div class="flex flex-col gap-2">
        <p class="m-0 text-sm leading-snug text-white text-center">
            {$LL.chat.status.do_not_disturb()}. Cliquez pour redevenir disponible et discuter avec les autres.
        </p>
    </div>
    <svelte:fragment slot="buttons">
        <button
            type="button"
            class="btn btn-secondary btn-sm flex-1"
            data-testid="do-not-disturb-activate"
            on:click|stopPropagation|preventDefault={handleActivate}
        >
            {$LL.chat.status.online()}
        </button>
    </svelte:fragment>
</ToastContainer>
