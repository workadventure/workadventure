<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import Popup from "../Modal/Popup.svelte";
    import Button from "../UI/Button.svelte";
    import { modals } from "@wa-modals";

    interface Props {
        isOpen: boolean;
    }

    let { isOpen }: Props = $props();
    let worldUrl = $state("");
    let errorMessage = $state<string | undefined>();
    let openingWorld = $state(false);
    let openingSignup = $state(false);

    async function joinWorld(): Promise<void> {
        const navigation = window.WAD?.navigation;
        if (!navigation) {
            errorMessage = $LL.actionbar.desktop.unavailable();
            return;
        }

        const url = worldUrl.trim();
        if (!url) {
            errorMessage = $LL.actionbar.desktop.urlRequired();
            return;
        }

        errorMessage = undefined;
        openingWorld = true;
        try {
            const result = await navigation.joinWorld(url);
            if (!result.ok) {
                errorMessage = result.error;
                openingWorld = false;
            }
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : $LL.actionbar.desktop.openFailed();
            openingWorld = false;
        }
    }

    async function openAdminSignup(): Promise<void> {
        const navigation = window.WAD?.navigation;
        if (!navigation) {
            errorMessage = $LL.actionbar.desktop.unavailable();
            return;
        }

        errorMessage = undefined;
        openingSignup = true;
        try {
            const result = await navigation.openAdminSignup();
            if (!result.ok) {
                errorMessage = result.error;
            }
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : $LL.actionbar.desktop.signupFailed();
        } finally {
            openingSignup = false;
        }
    }

    function submit(event: SubmitEvent): void {
        event.preventDefault();
        joinWorld().catch((error) => console.error("Failed to join desktop world", error));
    }
</script>

<Popup {isOpen}>
    {#snippet title()}
        <div>
            <div class="mb-1 text-xs font-bold uppercase tracking-wider text-secondary-300">
                {$LL.actionbar.desktop.section()}
            </div>
            <h1 class="text-2xl font-bold">{$LL.actionbar.desktop.title()}</h1>
        </div>
    {/snippet}

    {#snippet content()}
        <form id="desktop-world-switcher-form" class="mt-4 w-full" onsubmit={submit}>
            <p class="mb-5 text-sm leading-6 text-white/70">{$LL.actionbar.desktop.description()}</p>
            <label for="desktop-world-url" class="mb-2 block text-sm font-bold">
                {$LL.actionbar.desktop.urlLabel()}
            </label>
            <input
                id="desktop-world-url"
                data-testid="desktop-world-url"
                type="url"
                inputmode="url"
                autocomplete="url"
                placeholder={$LL.actionbar.desktop.urlPlaceholder()}
                bind:value={worldUrl}
                class="h-12 w-full rounded-xl border border-white/15 bg-black/30 px-4 text-white outline-none transition placeholder:text-white/35 hover:border-white/25 focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                aria-describedby={errorMessage ? "desktop-world-error" : undefined}
                required
            />

            {#if errorMessage}
                <p id="desktop-world-error" class="mt-2 text-sm text-danger-300" role="alert">{errorMessage}</p>
            {/if}

            <div class="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
                <div class="font-bold">{$LL.actionbar.desktop.createTitle()}</div>
                <p class="mt-1 text-sm leading-5 text-white/60">{$LL.actionbar.desktop.createDescription()}</p>
                <Button
                    variant="secondary"
                    appearance="ghost"
                    size="sm"
                    class="mt-3"
                    disabled={openingSignup}
                    onclick={openAdminSignup}
                >
                    {openingSignup ? $LL.actionbar.desktop.openingSignup() : $LL.actionbar.desktop.createAction()}
                </Button>
            </div>
        </form>
    {/snippet}

    {#snippet action()}
        <Button class="flex-1 justify-center" onclick={() => modals.close()}>
            {$LL.actionbar.cancel()}
        </Button>
        <Button
            variant="secondary"
            type="submit"
            class="flex-1 justify-center"
            disabled={openingWorld}
            dataTestId="desktop-world-submit"
            form="desktop-world-switcher-form"
        >
            {openingWorld ? $LL.actionbar.desktop.opening() : $LL.actionbar.desktop.openAction()}
        </Button>
    {/snippet}
</Popup>
