<script lang="ts">
    import { onMount } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { OnboardingScheduler, onboardingScheduler } from "../../Onboarding/OnboardingScheduler";
    import { builtinItems } from "../../Onboarding/builtinItems";
    import { onboardingView } from "../../Onboarding/stepKinds";
    import { loadWorldOnboarding, mergeItems } from "../../Onboarding/worldOnboarding";

    onMount(() => {
        const scene = gameManager.getCurrentGameScene();
        let scheduler: OnboardingScheduler | undefined;
        let destroyed = false;
        // The world's items come first in priority, so nothing starts before they are known.
        loadWorldOnboarding(scene.room.onboardingUrl)
            .then((world) => {
                if (destroyed) {
                    return;
                }
                scheduler = new OnboardingScheduler(scene, mergeItems(builtinItems, world), world?.quietPeriodMinutes);
                onboardingScheduler.set(scheduler);
            })
            .catch((error: unknown) => console.error("Onboarding did not start", error));
        return () => {
            destroyed = true;
            scheduler?.destroy();
            onboardingScheduler.set(undefined);
        };
    });
</script>

<!-- Keyed: each step mounts its own view, even when two steps in a row show the same component. -->
{#key $onboardingView}
    {#if $onboardingView}
        {@const View = $onboardingView.component}
        <View {...$onboardingView.props} />
    {/if}
{/key}
