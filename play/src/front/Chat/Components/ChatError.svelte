<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import Alert from "../../Components/UI/Alert.svelte";
    import Button from "../../Components/UI/Button.svelte";
    import { IconExclamation } from "@wa-icons";

    interface Props {
        // A custom label is a one-off error: it gets neither the explanation nor the retry button.
        label?: string;
    }

    let { label }: Props = $props();

    // Turns false when there was no connection attempt to retry (the chat never started): only a reload helps then.
    let canRetry = $state(true);

    function retry() {
        canRetry = gameManager.chatConnection.retryConnection();
    }
</script>

<div class="px-2 pb-2" role="alert" data-testid="chatConnectionError">
    <Alert variant="danger" class="w-full">
        <div class="flex gap-2">
            <IconExclamation font-size="20" class="shrink-0" />
            <div class="flex flex-col gap-1 items-start min-w-0">
                <div class="font-bold text-white">{label ?? $LL.chat.connectionError()}</div>
                {#if label === undefined}
                    <p class="m-0 text-white/75">{$LL.chat.connectionErrorDescription()}</p>
                    {#if canRetry}
                        <Button variant="danger" size="sm" class="mt-1" onclick={retry}>
                            {$LL.chat.connectionErrorRetry()}
                        </Button>
                    {:else}
                        <Button variant="danger" size="sm" class="mt-1" onclick={() => window.location.reload()}>
                            {$LL.chat.connectionErrorReload()}
                        </Button>
                    {/if}
                {/if}
            </div>
        </div>
    </Alert>
</div>
