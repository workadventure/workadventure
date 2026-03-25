<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import ToastContainer from "./ToastContainer.svelte";
    import { IconNetworkOff, IconAlertTriangle, IconX } from "@wa-icons";
    import { LivekitConnectionStatus } from "../../Livekit/utils/LivekitConnectionChecker";
    import { toastStore } from "../../Stores/ToastStore";

    export let toastUuid = "";
    export let status: LivekitConnectionStatus;
    export let duration: number | undefined = undefined;

    $: theme = status === LivekitConnectionStatus.Critical ? ("error" as const) : ("secondary" as const);

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
    <div slot="buttons">
        <button
            class="flex items-center justify-center p-2 hover:bg-white/10 rounded-full transition-colors"
            on:click={close}
            title={$LL.error.errorDialog.close()}
        >
            <IconX size="18" />
        </button>
    </div>
</ToastContainer>
