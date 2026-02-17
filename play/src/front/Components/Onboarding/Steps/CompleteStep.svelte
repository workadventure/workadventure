<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { fly } from "svelte/transition";
    import LL from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";

    const dispatch = createEventDispatcher<{
        next: void;
    }>();

    $: worldName =
        gameManager.getCurrentGameScene()?.room?.roomName ?? "WorkAdventure";

    function handleNext() {
        dispatch("next");
    }
</script>

<div class="fixed top-1/2 -right-10 transform -translate-x-14 -translate-y-1/2 z-[3001] pointer-events-auto">
    <div
        class="bg-contrast/90 backdrop-blur-lg rounded-xl p-6 max-w-lg shadow-2xl border border-white/20"
        in:fly={{ y: 10, duration: 400 }}
    >
        <div class="text-center space-y-6">
            <h2 class="text-3xl font-bold text-white mb-4">
                {$LL.onboarding.complete.title()}
            </h2>
            <p class="text-lg text-white/90 leading-relaxed">
                {$LL.onboarding.complete.description({ worldName })}
            </p>
            <div class="flex justify-center gap-4 pt-4">
                <button
                    class="px-6 py-3 bg-secondary hover:bg-secondary-600 text-white rounded-lg font-semibold transition-all"
                    on:click={handleNext}
                >
                    {$LL.onboarding.complete.finish()}
                </button>
            </div>
        </div>
    </div>
</div>
