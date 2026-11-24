<script lang="ts">
    import { setContext } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { menuVisiblilityStore } from "../../Stores/MenuStore";
    import { onboardingScheduler } from "../../Onboarding/OnboardingScheduler";
    import ActionBarButton from "../ActionBar/ActionBarButton.svelte";
    import { IconHelpCircle } from "@wa-icons";

    // The ActionBarButton component is displayed differently in the menu.
    // We use the context to decide how to render it.
    setContext("inMenu", true);

    // Read when the menu opens: the list depends on rights and tags, which do not change while it is open.
    const items = $onboardingScheduler?.helpItems ?? [];

    function startItem(id: string) {
        // Closed first: the tour points at the action bar, under the menu.
        menuVisiblilityStore.set(false);
        $onboardingScheduler?.startFromHelp(id);
    }
</script>

<div class="customize-main">
    <div class="submenu p-4">
        <h2 class="text-white text-lg font-semibold mb-4">{$LL.menu.sub.help()}</h2>
        <div class="space-y-2">
            {#each items as item (item.id)}
                <ActionBarButton
                    label={item.title()}
                    dataTestId={`onboarding-help-${item.id}`}
                    onclick={() => startItem(item.id)}
                >
                    <IconHelpCircle font-size="20" />
                </ActionBarButton>
            {/each}
        </div>
    </div>
</div>
