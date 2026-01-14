<script lang="ts">
    import { setContext } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { onboardingStore } from "../../Stores/OnboardingStore";
    import { menuVisiblilityStore } from "../../Stores/MenuStore";
    import ActionBarButton from "../ActionBar/ActionBarButton.svelte";

    // The ActionBarButton component is displayed differently in the menu.
    // We use the context to decide how to render it.
    setContext("inMenu", true);

    function restartOnboarding() {
        onboardingStore.restart();
        menuVisiblilityStore.set(false);
    }
</script>

<div class="customize-main">
    <div class="submenu p-4">
        <h2 class="text-white text-lg font-semibold mb-4">{$LL.menu.sub.help()}</h2>
        <div class="space-y-2">
            <ActionBarButton
                label="Restart tutorial"
                on:click={restartOnboarding}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-6 h-6"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                </svg>
            </ActionBarButton>
        </div>
    </div>
</div>
