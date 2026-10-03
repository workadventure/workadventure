<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import ToastContainer from "./ToastContainer.svelte";
    import { IconLoader, IconNetworkOff, IconRefresh } from "@wa-icons";

    interface Props {
        toastUuid?: string;
        // The server announced an upgrade (see ServerUpgrade): the conversations go on while it restarts
        upgrading?: boolean;
    }

    let { toastUuid = "", upgrading = false }: Props = $props();
</script>

<ToastContainer theme="secondary" extraClasses="w-full min-w-72 max-w-sm sm:min-w-80 sm:max-w-md" {toastUuid}>
    <div class="flex items-center gap-3 text-left" data-testid="websocket-reconnecting-toast">
        <div class="relative flex h-8 w-8 shrink-0 items-center justify-center">
            {#if upgrading}
                <IconRefresh class="text-white/80" font-size="1.35rem" />
            {:else}
                <IconNetworkOff class="text-white/80" font-size="1.35rem" />
            {/if}
            <IconLoader class="absolute -right-1 -bottom-1 animate-spin text-secondary" font-size="1rem" />
        </div>
        <div class="flex min-w-0 flex-col">
            <p class="m-0 text-sm font-semibold leading-snug text-white">
                {upgrading ? $LL.warning.serverUpdatingTitle() : $LL.warning.connectionLostTitle()}
            </p>
            <p class="m-0 text-xs leading-snug text-white/80">
                {upgrading ? $LL.warning.serverUpdatingSubtitle() : $LL.messageScreen.connecting()}
            </p>
        </div>
    </div>
</ToastContainer>
