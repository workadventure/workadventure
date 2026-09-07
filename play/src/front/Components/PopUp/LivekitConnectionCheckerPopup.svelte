<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import { LivekitConnectionStatus } from "../../Livekit/utils/LivekitConnectionChecker";
    import PopUpContainer from "./PopUpContainer.svelte";
    import { IconNetworkOff } from "@wa-icons";

    interface Props {
        status?: LivekitConnectionStatus;
        onclose?: () => void;
    }

    const { status = LivekitConnectionStatus.Critical, onclose }: Props = $props();

    function reload() {
        window.location.reload();
    }
</script>

<PopUpContainer reduceOnSmallScreen={true}>
    <div class="flex flex-col items-center gap-2 pointer-events-auto">
        <IconNetworkOff font-size="28" color="rgb(234, 110, 83)" />
        <p class="mt-0 mb-0">
            {#if status === LivekitConnectionStatus.Critical}
                {$LL.warning.livekitConnection.critical()}
            {:else}
                {$LL.warning.livekitConnection.warning()}
            {/if}
        </p>
    </div>
    {#snippet buttons()}
        <button type="button" class="btn btn-secondary w-1/2 justify-center" onclick={reload}>
            {$LL.error.errorDialog.reload()}
        </button>
        <button type="button" class="btn btn-light btn-ghost w-1/2 justify-center" onclick={() => onclose?.()}>
            {$LL.error.errorDialog.close()}
        </button>
    {/snippet}
</PopUpContainer>
