<script lang="ts">
    import { setContext } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { menuVisiblilityStore } from "../../Stores/MenuStore";
    import { onboardingScheduler } from "../../Onboarding/OnboardingScheduler";
    import type { HelpItem } from "../../Onboarding/OnboardingScheduler";
    import { anchorPlace, anchorsChanged } from "../../Onboarding/OnboardingAnchors";
    import ActionBarButton from "../ActionBar/ActionBarButton.svelte";
    import InputSwitch from "../Input/InputSwitch.svelte";
    import { IconCheck, IconHelpCircle } from "@wa-icons";

    // The ActionBarButton component is displayed differently in the menu.
    // We use the context to decide how to render it.
    setContext("inMenu", true);

    // Live: someone can walk up while the menu is open, and the bubble brings the buttons of its tips.
    let items: HelpItem[] = $state([]);
    let showTips = $state(true);
    $effect(() => {
        const scheduler = $onboardingScheduler;
        showTips = scheduler?.showTips ?? true;
        return anchorsChanged.subscribe(() => {
            items = scheduler?.helpItems ?? [];
        });
    });

    // Undoes "Stop showing tips", which the tips themselves offer.
    function toggleShowTips() {
        $onboardingScheduler?.setShowTips(!showTips);
        showTips = $onboardingScheduler?.showTips ?? true;
    }

    function toggleRequest(id: string) {
        $onboardingScheduler?.toggleRequest(id);
        items = $onboardingScheduler?.helpItems ?? [];
    }

    function startItem(id: string) {
        // Closed first: the tour points at the action bar, under the menu.
        menuVisiblilityStore.set(false);
        $onboardingScheduler?.startFromHelp(id);
    }
</script>

<div class="customize-main">
    <div class="submenu p-4">
        <h2 class="text-white text-lg font-semibold mb-4">{$LL.menu.sub.help()}</h2>
        {#if $onboardingScheduler}
            <div class="mb-4">
                <InputSwitch
                    id="onboarding-show-tips"
                    value={showTips}
                    onchange={toggleShowTips}
                    label={$LL.onboarding.help.showTips()}
                />
            </div>
        {/if}
        <div class="space-y-2">
            {#each items as { item, missingAnchor, requested } (item.id)}
                {#if missingAnchor}
                    <!-- It cannot start here: the user can ask to see it when its target shows up. -->
                    <div
                        class="mb-1 flex w-full select-none items-center gap-2 rounded p-2 text-sm font-bold text-neutral-100"
                        data-testid="onboarding-help-{item.id}"
                    >
                        <span class="flex h-6 w-6 shrink-0 items-center justify-center opacity-50">
                            <IconHelpCircle font-size="20" />
                        </span>
                        <span class="flex flex-1 flex-col opacity-50">
                            <span id="onboarding-help-title-{item.id}">{item.title()}</span>
                            <span id="onboarding-help-hint-{item.id}" class="text-xs font-normal">
                                {anchorPlace(missingAnchor)}
                            </span>
                        </span>
                        <button
                            type="button"
                            aria-pressed={requested === true}
                            aria-describedby="onboarding-help-title-{item.id} onboarding-help-hint-{item.id}"
                            class={[
                                "flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs font-bold text-white",
                                requested ? "bg-secondary hover:bg-secondary-600" : "bg-white/10 hover:bg-white/20",
                            ]}
                            data-testid="onboarding-help-remind-{item.id}"
                            onclick={() => toggleRequest(item.id)}
                        >
                            {#if requested}
                                <IconCheck font-size="14" />
                            {/if}
                            {$LL.onboarding.help.remindMe()}
                        </button>
                    </div>
                {:else}
                    <ActionBarButton
                        label={item.title()}
                        dataTestId={`onboarding-help-${item.id}`}
                        onclick={() => startItem(item.id)}
                    >
                        <IconHelpCircle font-size="20" />
                    </ActionBarButton>
                {/if}
            {/each}
        </div>
    </div>
</div>
