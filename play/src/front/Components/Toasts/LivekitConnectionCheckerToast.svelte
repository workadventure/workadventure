<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import { LivekitConnectionStatus } from "../../Livekit/utils/LivekitConnectionChecker";
    import { toastStore } from "../../Stores/ToastStoreSingleton";
    import ToastContainer from "./ToastContainer.svelte";
    import { IconNetworkOff, IconAlertTriangle, IconX } from "@wa-icons";

    interface Props {
        toastUuid?: string;
        status: LivekitConnectionStatus;
        duration?: number;
    }

    let { toastUuid = "", status, duration = undefined }: Props = $props();

    const theme = $derived(status === LivekitConnectionStatus.Critical ? ("error" as const) : ("secondary" as const));

    function close() {
        toastStore.removeToast(toastUuid);
    }
</script>

<ToastContainer {theme} extraClasses="" {toastUuid} {duration}>
    <div class="px-1 flex items-center gap-2">
        {#if status === LivekitConnectionStatus.Critical}
            <IconNetworkOff color="rgb(234, 110, 83)" />
            {$LL.warning.livekitConnection.critical()}
        {:else}
            <IconAlertTriangle color="rgb(255, 204, 0)" />
            {$LL.warning.livekitConnection.warning()}
        {/if}
    </div>
    {#snippet buttons()}
        <button
            class="flex items-center justify-center p-2 hover:bg-white/10 rounded-full transition-colors"
            onclick={close}
            title={$LL.error.errorDialog.close()}
        >
            <IconX font-size="18" />
        </button>
    {/snippet}
</ToastContainer>
