<script lang="ts">
    import { onMount } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { OnboardingScheduler, onboardingScheduler } from "../../Onboarding/OnboardingScheduler";
    import { builtinItems } from "../../Onboarding/builtinItems";
    import { onboardingView } from "../../Onboarding/stepKinds";

    onMount(() => {
        const scheduler = new OnboardingScheduler(gameManager.getCurrentGameScene(), builtinItems);
        onboardingScheduler.set(scheduler);
        return () => {
            scheduler.destroy();
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
