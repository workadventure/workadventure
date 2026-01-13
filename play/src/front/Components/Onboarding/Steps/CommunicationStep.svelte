<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { fly } from "svelte/transition";
    import LL from "../../../../i18n/i18n-svelte";

    const dispatch = createEventDispatcher<{
        next: void;
    }>();

    function handleNext() {
        dispatch("next");
    }
</script>

<div class="fixed top-1/2 right-0 transform -translate-x-1/2 -translate-y-1/2 z-[3001] pointer-events-auto">
    <div
        class="bg-contrast/90 backdrop-blur-lg rounded-xl p-6 max-w-lg shadow-2xl border border-white/20"
        in:fly={{ y: 10, scale: 0.9, duration: 400 }}
    >
        <div class="space-y-4">
            <h3 class="text-xl font-bold text-white">
                {$LL.onboarding.communication.title()}
            </h3>
            <p class="text-sm text-white/90 mb-4">
                {$LL.onboarding.communication.description()}
            </p>
            {#if $LL.onboarding.communication.image()}
                <img
                    src={$LL.onboarding.communication.image()}
                    alt="Communication example"
                    class="w-full rounded-lg mb-4"
                />
            {/if}
            <button
                class="w-full px-4 py-2 bg-secondary hover:bg-secondary-600 text-white rounded-lg font-semibold transition-all"
                on:click={handleNext}
            >
                {$LL.onboarding.communication.next()}
            </button>
        </div>
    </div>
</div>
