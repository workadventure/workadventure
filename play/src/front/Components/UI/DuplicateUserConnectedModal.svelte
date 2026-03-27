<script lang="ts">
    import {
        duplicateUserConnectedStore,
    } from "../../Stores/DuplicateUserConnectedStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { localUserStore } from "../../Connection/LocalUserStore";

    let dontRemindAgain = false;

    function confirmAndContinue() {
        if (dontRemindAgain) {
            try {
                localUserStore.setDuplicateUserDontRemind(true);
            } catch {
                console.error("Failed to set DUPLICATE_USER_DONT_REMIND_KEY");
            }
        }
        duplicateUserConnectedStore.setDuplicateConnected(false);
    }
</script>

{#if $duplicateUserConnectedStore}
    <div
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-lg"
        role="alertdialog"
        aria-labelledby="duplicate-user-title"
        aria-describedby="duplicate-user-message"
    >
        <div class="w-full max-w-md rounded-2xl bg-contrast p-6 shadow-2xl" role="document">
            <h2 id="duplicate-user-title" class="text-xl font-bold text-white">
                {$LL.warning.duplicateUserConnected.title()}
            </h2>
            <p id="duplicate-user-message" class="mt-3 text-sm text-white/90">
                {$LL.warning.duplicateUserConnected.message()}
            </p>
            <label class="mt-4 flex cursor-pointer items-center gap-2 text-sm text-white/90">
                <input type="checkbox" bind:checked={dontRemindAgain} class="rounded" />
                <span>{$LL.warning.duplicateUserConnected.dontRemindAgain()}</span>
            </label>
            <div class="mt-6 flex justify-center">
                <button
                    type="button"
                    class="btn btn-secondary"
                    on:click={confirmAndContinue}
                    data-testid="duplicate-user-confirm-continue"
                >
                    {$LL.warning.duplicateUserConnected.confirmContinue()}
                </button>
            </div>
        </div>
    </div>
{/if}
